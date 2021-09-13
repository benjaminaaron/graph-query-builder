import { onValidSparqlChange, setSparqlQuery, getQuery } from './panels/sparql-editor'
import { setGraphBuilderData, onValidGraphChange } from './panels/graph-builder';
import { onEditorChange, updateLanguageEditor } from "./panels/language-interpreter";
import { querySparqlEndpoint, fetchAllTriplesFromEndpoint, extractTriplesFromQuery } from "./utils";
import { setGraphOutputData } from "./panels/graph-output";
import { buildTable } from "./panels/results-table";

const parser = new require('sparqljs').Parser();
const generator = new require('sparqljs').Generator();
let currentSparqlModel;
let outputElements;

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
        "  ?someone ?opinion :DowntownAbbey .\n" +
        "  ?flat :isOnFloor 2 .\n" +
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
    let prefixes = currentSparqlModel.prefixes;
    fetchAllTriplesFromEndpoint(prefixes, allGraphData => {
        setGraphOutputData(allGraphData);
        querySparqlEndpoint(getQuery(), (variables, rows) => {
            console.log("query result:", variables, rows);
            buildTable(variables, rows, prefixes, selectedRow => {
                // TODO
            });
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
