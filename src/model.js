import { onValidSparqlChange, setSparqlQuery, getQuery } from './sparql-editor'
import { setGraphBuilderData, onValidGraphChange } from './graph-builder';
import { onEditorChange, setEditorValue } from "./language-interpreter";
import { querySparqlEndpoint, fetchAllTriplesFromEndpoint, parseTriples, extractWordFromUri, buildShortFormIfPrefixExists } from "./utils";
import { setGraphOutputData } from "./graph-output";

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
            updateLanguageEditor();
            setGraphBuilderData(extractTriplesFromQuery(true, true)); // edge.source/target will be made the node objects instead of just ids
            break;
        case Domain.GRAPH:
            currentSparqlModel = constructSparqlModelFromGraphBuilderData(data);
            setSparqlQuery(generator.stringify(currentSparqlModel));
            updateLanguageEditor();
            break;
        case Domain.LANGUAGE:
            // not supported (yet)
            break;
    }
    acceptingChanges = true;
};

const extractTriplesFromQuery = (extractFromSelect, extractFromConstruct) => {
    let nodes = {};
    let edges = [];
    if (extractFromSelect) {
        parseTriples(currentSparqlModel.where[0].triples, nodes, edges, false);
    }
    if (extractFromConstruct) {
        parseTriples(currentSparqlModel.template, nodes, edges, true);
    }
    return { prefixes: currentSparqlModel.prefixes, nodes: nodes, edges: edges };
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

const updateLanguageEditor = () => {
    let keywords = { NamedNode: [], Variable: [], Literal: [] };

    let selectGraphData = extractTriplesFromQuery(true, false);
    let fullContent = buildSentence(selectGraphData);
    extractKeywords(selectGraphData, keywords);

    if (currentSparqlModel.queryType === "CONSTRUCT") {
        let constructGraphData = extractTriplesFromQuery(false, true);
        fullContent = "From this:\n\n" + fullContent + "\n\nWe infer that:\n\n" + buildSentence(constructGraphData);
        extractKeywords(constructGraphData, keywords);
    }

    setEditorValue(fullContent, keywords);
};

const extractKeywords = (graphData, keywords) => {
    Object.values(graphData.nodes).filter(node => node.wordNormal).forEach(node => addKeywords(node, keywords));
    graphData.edges.filter(edge => edge.wordNormal).forEach(edge => addKeywords(edge, keywords));
};

const buildSentence = graphData => {
    let longestPathNodeKeys = findLongestPath(graphData.nodes);
    let longestPath = expandNodeKeysToFullPath(longestPathNodeKeys, graphData);
    let sentence = "";
    let branchCount;
    for (let i = 0; i < longestPath.length; i++) {
        let element = longestPath[i];
        setWord(element);
        sentence += " " + element.wordNormal;
        // only nodes have paths
        branchCount = 0;
        element.paths && element.paths.filter(path => isSideBranch(longestPathNodeKeys, path)).forEach(path => {
            let expandedPath = expandNodeKeysToFullPath(path, graphData).slice(1); // skip the first
            expandedPath.forEach(branchElement => setWord(branchElement));
            let subSentenceStarter = ["human", "person"].some(word => expandedPath[1].wordNormal.includes(word)) ? "who" : "which";
            sentence += branchCount === 0 ? ", " + subSentenceStarter : " and";
            expandedPath.forEach(branchElement => sentence += " " + branchElement.wordNormal);
            branchCount ++;
        });
        if ((i + 1) % 3 === 0) {
            sentence += " that";
        } else if (branchCount > 0) {
            sentence += ",";
        }
    }
    if (sentence.endsWith(" that")) { // TODO streamline these conditions
        sentence = sentence.substr(0, sentence.length - " that".length);
    }
    return sentence.substr(1) + ".";
};

const addKeywords = (element, keywords) => {
    // this is a hack to get the highlighting going in the editor, the proper way would be to get the regex right though
    if (element.type === "Variable") {
        keywords.Variable.push(element.word);
        return;
    }
    let words = element.wordNormal.split(" ");
    if (words.length > 1) {
        words.forEach(word => keywords[element.type].push(word));
    }
    keywords[element.type].push(element.wordNormal);
};

const isSideBranch = (longestPath, testPath) => {
    for (let i = 0; i < longestPath.length; i++) {
        if (longestPath[i] === testPath[0]) {
            return longestPath[i + 1] !== testPath[1];
        }
    }
    return true;
};

const setWord = entity => {
    let value = entity.value;
    if (entity.type === "NamedNode") {
        value = extractWordFromUri(value);
    }
    entity.word = value;
    entity.wordNormal = value.replace(/([A-Z])/g, " $1").toLowerCase().trim(); // via stackoverflow.com/a/7225450/2474159
    if (entity.type === "Variable") {
        entity.wordNormal = "<" + entity.wordNormal + ">";
    }
};

const findLongestPath = nodes => {
    let allPathsFromAllNodes = [];
    Object.values(nodes).forEach(node => {
        let allPathsFromThisNode = [];
        walkFromHere(node, [], allPathsFromThisNode, nodes);
        allPathsFromAllNodes.push.apply(allPathsFromAllNodes, allPathsFromThisNode);
    });
    return allPathsFromAllNodes.reduce((prev, current) => {
        return (prev.length > current.length) ? prev : current
    });
};

const expandNodeKeysToFullPath = (pathNodeKeys, graph) => {
    let path = [graph.nodes[pathNodeKeys[0]]];
    for (let i = 0; i < pathNodeKeys.length - 1; i++) {
        let node = graph.nodes[pathNodeKeys[i]];
        let nextNode = graph.nodes[pathNodeKeys[i + 1]];
        let edgeBetween = graph.edges.filter(edge => edge.source === node.id && edge.target === nextNode.id)[0];
        path.push(edgeBetween);
        path.push(nextNode);
    }
    return path;
};

const walkFromHere = (node, path, allPaths, nodes) => {
    let alreadyOnPath = path.includes(node.value);
    path.push(node.value);
    if (alreadyOnPath || node.children.length === 0) {
        allPaths.push(path);
        if (path.length > 1) { // that's only the root node then
            nodes[path[0]].paths.push(path);
        }
        return;
    }
    node.children.forEach(child => walkFromHere(child, path.slice(0), allPaths, nodes));
};

export { initModel }
