import { onValidSparqlChange, setSparqlQuery, getQuery } from './sparql-editor'
import { setGraphBuilderData, onValidGraphChange } from './graph-builder';
import { onEditorChange, setEditorValue } from "./language-interpreter";
import { extractWordFromUri } from "./utils";
import { SparqlEndpointFetcher } from "fetch-sparql-endpoint";
import { setGraphOutputData } from "./graph-output";

const parser = new require('sparqljs').Parser();
const generator = new require('sparqljs').Generator();
const sparqlEndpointFetcher = new SparqlEndpointFetcher();
const SPARQL_ENDPOINT = "http://localhost:7200/repositories/onto-engine";

const Domain = {
    SPARQL: 1, GRAPH: 2, LANGUAGE: 3
};
let acceptingChanges = true; // to avoid changes triggering circular onChange-calls

const initModel = submitButtonId => {
    onValidSparqlChange(data => acceptingChanges && translateToOtherDomains(Domain.SPARQL, data));
    onValidGraphChange(data => acceptingChanges && translateToOtherDomains(Domain.GRAPH, data));
    onEditorChange(data => acceptingChanges && translateToOtherDomains(Domain.LANGUAGE, data));

    if (submitButtonId) {
        document.getElementById(submitButtonId).addEventListener('click', () => submitSparqlQuery());
    }

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
    let query = getQuery();
    let prefixes = parser.parse(query).prefixes

    fetchAllTriplesFromEndpoint(prefixes, () => {
        querySparqlEndpoint(query, (variables, data) => {
            console.log("query result:", variables, data);

            // TODO
            
        }).then();
    });
};

const fetchAllTriplesFromEndpoint = (prefixes, done) => {
    querySparqlEndpoint("SELECT * WHERE { ?s ?p ?o }", (variables, data) => {
        let nodes = {};
        let edges = [];
        data.forEach(triple => {
            let subNode = addOrGetNode(nodes, triple.s);
            let objNode = addOrGetNode(nodes, triple.o);
            addEdge(edges, triple.p, subNode.id, objNode.id);
        });
        setGraphOutputData({ prefixes: prefixes, nodes: nodes, edges: edges });
        done();
    }).then();
};

async function querySparqlEndpoint(query, onResults) {
    const bindingsStream = await sparqlEndpointFetcher.fetchBindings(SPARQL_ENDPOINT, query);
    let variables;
    let data = [];
    bindingsStream.on('variables', vars => variables = vars);
    bindingsStream.on('data', bindings => data.push(bindings));
    bindingsStream.on('end', () => onResults(variables, data));
}

const translateToOtherDomains = (sourceDomain, data) => {
    acceptingChanges = false;
    let sparqlModel, graphData;
    switch (sourceDomain) {
        case Domain.SPARQL:
            sparqlModel = parser.parse(data);
            updateLanguageEditor(sparqlModel);
            setGraphBuilderData(extractTriplesFromQuery(sparqlModel, true, true)); // edge.source/target will be made the node objects instead of just ids
            break;
        case Domain.GRAPH:
            sparqlModel = constructSparqlModelFromGraphBuilderData(data);
            setSparqlQuery(generator.stringify(sparqlModel));
            updateLanguageEditor(sparqlModel);
            break;
        case Domain.LANGUAGE:
            // not supported (yet)
            break;
    }
    acceptingChanges = true;
};

const extractTriplesFromQuery = (sparqlModel, extractFromSelect, extractFromConstruct) => {
    let nodes = {};
    let edges = [];
    if (extractFromSelect) {
        parseTriples(sparqlModel.where[0].triples, nodes, edges, false);
    }
    if (extractFromConstruct) {
        parseTriples(sparqlModel.template, nodes, edges, true);
    }
    return { prefixes: sparqlModel.prefixes, nodes: nodes, edges: edges };
};

const parseTriples = (triplesJson, nodes, edges, markNew) => {
    triplesJson && triplesJson.forEach(triple => {
        let subNode = addOrGetNode(nodes, triple.subject, markNew);
        let objNode = addOrGetNode(nodes, triple.object, markNew);
        addEdge(edges, triple.predicate, subNode.id, objNode.id, markNew);
        // in this way from multiple same-direction edges between nodes, only one will be taken into account for computing the longest path
        // opposite-direction edges between same nodes lead to not-well defined behaviour as the alreadyOnPath-stopper kicks in, but not well defined TODO
        if (!subNode.children.includes(objNode)) {
            subNode.children.push(objNode);
        }
    });
};

const addOrGetNode = (nodes, subOrObj, markNew = false) => {
    let value = subOrObj.value;
    if (!nodes[value]) {
        nodes[value] = { id: Object.keys(nodes).length, value: value, type: subOrObj.termType, children: [], paths: [] };
        if (markNew) nodes[value].isNewInConstruct = true;
    }
    return nodes[value];
};

const addEdge = (edges, predicate, subNodeId, objNodeId, markNew = false) => {
    let value = predicate.value;
    let edge = { id: edges.length, source: subNodeId, target: objNodeId, value: value, type: predicate.termType };
    if (markNew) edge.isNewInConstruct = true;
    edges.push(edge);
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

const updateLanguageEditor = sparqlModel => {
    let keywords = { NamedNode: [], Variable: [], Literal: [] };

    let selectGraphData = extractTriplesFromQuery(sparqlModel, true, false);
    let fullContent = buildSentence(selectGraphData);
    extractKeywords(selectGraphData, keywords);

    if (sparqlModel.queryType === "CONSTRUCT") {
        let constructGraphData = extractTriplesFromQuery(sparqlModel, false, true);
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
