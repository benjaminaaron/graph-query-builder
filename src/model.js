import { onValidSparqlChange, setSparqlQuery, getQuery } from './panels/sparql-editor'
import { setGraphBuilderData, onValidGraphChange } from './panels/graph-builder';
import { onEditorChange, updateLanguageEditor } from "./panels/language-interpreter";
import { querySparqlEndpoint, fetchAllTriplesFromEndpoint, extractTriplesFromQuery, buildShortFormIfPrefixExists } from "./utils";
import { setGraphOutputData } from "./panels/graph-output";

const parser = new require('sparqljs').Parser();
const generator = new require('sparqljs').Generator();
let currentSparqlModel;
let outputElements;
let selectedRow = null;

const Domain = {
    SPARQL: 1, GRAPH: 2, LANGUAGE: 3
};
let acceptingChanges = true; // to avoid changes triggering circular onChange-calls

const initModel = _outputElements => {
    onValidSparqlChange(data => acceptingChanges && translateToOtherDomains(Domain.SPARQL, data));
    onValidGraphChange(data => acceptingChanges && translateToOtherDomains(Domain.GRAPH, data));
    onEditorChange(data => acceptingChanges && translateToOtherDomains(Domain.LANGUAGE, data));

    outputElements = _outputElements;
    document.getElementById(outputElements.submitButtonId).addEventListener('click', () => submitSparqlQuery());

    let query = "PREFIX : <http://onto.de/default#>\n" +
        "SELECT * WHERE {\n" +
        "  ?someone :isA :Human ;\n" +
        "  \t:rentsA ?flat .\n" +
        "  ?flat :isLocatedIn :Hamburg .\n" +
        "}";
    /*let query = "PREFIX : <http://onto.de/default#> \n" +
        "CONSTRUCT { \n" +
        "  ?someone :livesIn ?location . \n" +
        "} WHERE { \n" +
        "    ?someone :isA :Human . \n" +
        "    ?someone :likes :iceCream . \n" +
        "    ?someone :rentsA ?flat . \n" +
        "    ?flat :isLocatedIn ?location . \n" +
        "}";*/
    setSparqlQuery(query);
};

const submitSparqlQuery = () => {
    outputElements.outputWrapperDiv.style.display = 'flex';
    let query = getQuery();
    let prefixes = currentSparqlModel.prefixes

    fetchAllTriplesFromEndpoint(prefixes, graphData => {
        setGraphOutputData(graphData);
        querySparqlEndpoint(query, (variables, rows) => {
            console.log("query result:", variables, rows);
            let parentEl = outputElements.queryResultsDiv;
            while (parentEl.firstChild) parentEl.removeChild(parentEl.lastChild);
            let table = document.createElement('table');
            table.setAttribute("id", "queryResultsTable");
            let tr = document.createElement('tr');
            variables.forEach(col => {
                let th = document.createElement('th');
                let text = document.createTextNode("?" + col.value);
                th.appendChild(text);
                tr.appendChild(th);
            });
            table.appendChild(tr);
            rows.forEach(row => {
                tr = document.createElement('tr');
                row.tr = tr;
                variables.forEach(col => {
                    let cell = row[col.value];
                    let td = document.createElement('td');
                    td.classList.add(cell.termType);
                    let text = document.createTextNode(buildShortFormIfPrefixExists(prefixes, cell.value));
                    td.appendChild(text);
                    tr.appendChild(td);
                });
                tr.addEventListener("click", () => {
                    selectedRow && selectedRow.tr.classList.remove("selectedRow");
                    if (row === selectedRow) {
                        selectedRow = null;
                    } else {
                        selectedRow = row;
                        row.tr.classList.add("selectedRow");
                    }

                    // TODO
                });
                table.appendChild(tr);
            });
            parentEl.appendChild(table);
        }).then();
    });
};

const translateToOtherDomains = (sourceDomain, data) => {
    acceptingChanges = false;
    switch (sourceDomain) {
        case Domain.SPARQL:
            currentSparqlModel = parser.parse(data);
            updateLanguageEditor(currentSparqlModel);
            setGraphBuilderData(extractTriplesFromQuery(currentSparqlModel, true, true)); // edge.source/target will be made the node objects instead of just ids
            break;
        case Domain.GRAPH:
            currentSparqlModel = constructSparqlModelFromGraphBuilderData(data);
            setSparqlQuery(generator.stringify(currentSparqlModel));
            updateLanguageEditor(currentSparqlModel);
            break;
        case Domain.LANGUAGE:
            // not supported (yet)
            break;
    }
    acceptingChanges = true;
};

const constructSparqlModelFromGraphBuilderData = data => {
    let isConstructQuery = data.constructTriples.length > 0;
    let constructedSparqlModel = {
        prefixes: data.prefixes,
        queryType: isConstructQuery ? "CONSTRUCT" : "SELECT",
        type: "query",
        where: [{
            type: "bgp",
            triples: data.whereTriples
        }]
    };
    if (isConstructQuery) {
        constructedSparqlModel.template = data.constructTriples;
    } else {
        constructedSparqlModel.variables = [{
            termType: "Wildcard",
            value: "*"
        }];
    }
    return constructedSparqlModel;
};

export { initModel }
