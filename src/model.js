import { onValidSparqlChange, setSparqlQuery } from './sparql-editor'
import { setGraphBuilderData, onValidGraphChange } from './graph-builder';
import { onEditorChange, setEditorValue } from "./language-interpreter";
import { extractWordFromUri } from "./utils";

const SparqlParser = require('sparqljs').Parser;
const parser = new SparqlParser();
const SparqlGenerator = require('sparqljs').Generator;
const generator = new SparqlGenerator({});

const Domain = {
    SPARQL: 1, GRAPH: 2, LANGUAGE: 3
};
let acceptingChanges = true; // to avoid changes triggering circular onChange-calls

const initModel = () => {
    onValidSparqlChange(data => acceptingChanges && translateToOtherDomains(Domain.SPARQL, data));
    onValidGraphChange(data => acceptingChanges && translateToOtherDomains(Domain.GRAPH, data));
    onEditorChange(data => acceptingChanges && translateToOtherDomains(Domain.LANGUAGE, data));

    /*let query = "PREFIX : <http://onto.de/default#>\n" +
        "SELECT * WHERE {\n" +
        "  ?sub :isA :Human ;\n" +
        "  \t:livesIn ?obj ;\n" +
        "  \t:likes :iceCream .\n" +
        "  ?obj :isA :city ;\n" +
        "  \t:isLocatedIn :Germany .\n" +
        "}";*/
    let query = "PREFIX : <http://onto.de/default#> \n" +
        "CONSTRUCT { \n" +
        "  ?person :livesIn ?location . \n" +
        "} WHERE { \n" +
        "    ?person :isA :Human . \n" +
        "    ?person :rents ?rentingObject . \n" +
        "    ?rentingObject :locatedIn ?location . \n" +
        "}";
    setSparqlQuery(query);
};

const translateToOtherDomains = (sourceDomain, data) => {
    acceptingChanges = false;
    let sparqlModel, graphData;
    switch (sourceDomain) {
        case Domain.SPARQL:
            sparqlModel = parser.parse(data);
            graphData = buildGraphDataFromSparqlModel(sparqlModel);
            updateLanguageEditor(graphData);
            setGraphBuilderData(graphData); // edge.source/target will be made the node objects instead of just ids
            break;
        case Domain.GRAPH:
            sparqlModel = constructSparqlModelFromGraphBuilderData(data);
            setSparqlQuery(generator.stringify(sparqlModel));
            graphData = buildGraphDataFromSparqlModel(sparqlModel);
            updateLanguageEditor(graphData);
            break;
        case Domain.LANGUAGE:
            // not supported (yet)
            break;
    }
    acceptingChanges = true;
};

const buildGraphDataFromSparqlModel = sparqlModel => {
    let nodes = {};
    let edges = {};
    parseTriples(sparqlModel.where[0].triples, nodes, edges, false);
    switch (sparqlModel.queryType) {
        case "SELECT":
            let variables = sparqlModel.variables.map(varObj => varObj.value);
            // TODO
            break;
        case "CONSTRUCT":
            parseTriples(sparqlModel.template, nodes, edges, true);
            break;
    }
    return { prefixes: sparqlModel.prefixes, nodes: nodes, edges: Object.values(edges) };
};

const parseTriples = (triplesJson, nodes, edges, markNew) => {
    triplesJson && triplesJson.forEach(triple => {
        let subNode = addOrGetNode(nodes, triple.subject, markNew);
        let objNode = addOrGetNode(nodes, triple.object, markNew);
        let edge = addOrGetEdge(edges, triple.predicate, subNode.id, objNode.id, markNew);
        // in this way from multiple same-direction edges between nodes, only one will be taken into account for computing the longest path
        // opposite-direction edges between same nodes lead to not-well defined behaviour as the alreadyOnPath-stopper kicks in, but not well defined TODO
        if (!subNode.children.includes(objNode)) {
            subNode.children.push(objNode);
        }
    });
};

const addOrGetNode = (nodes, subOrObj, markNew) => {
    let value = subOrObj.value;
    if (!nodes[value]) {
        nodes[value] = { id: Object.keys(nodes).length, value: value, type: subOrObj.termType, children: [], paths: [] };
        if (markNew) nodes[value].isNewInConstruct = true;
    }
    return nodes[value];
};

const addOrGetEdge = (edges, predicate, subNodeId, objNodeId, markNew) => {
    let value = predicate.value;
    if (!edges[value]) {
        edges[value] = { id: Object.keys(edges).length, source: subNodeId, target: objNodeId, value: value, type: predicate.termType };
        if (markNew) edges[value].isNewInConstruct = true;
    }
    return edges[value];
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

const updateLanguageEditor = graphData => {
    // TODO distinguish SELECT and CONTRIBUTE queries:
    // treat nodes/edges separate in CONTRIBUTE case and append something like: "For matching items we insert..."
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
        if ((i + 1) % 3 === 0) { // TODO not if "that" would be the very end of the sentence
            sentence += " that";
        } else if (branchCount > 0) {
            sentence += ",";
        }
    }
    sentence = sentence.substr(1) + ".";
    let keywords = { NamedNode: [], Variable: [], Literal: [] };
    Object.values(graphData.nodes).filter(node => node.wordNormal).forEach(node => addKeywords(node, keywords));
    graphData.edges.filter(edge => edge.wordNormal).forEach(edge => addKeywords(edge, keywords));
    setEditorValue(sentence, keywords);
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
