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

    let query = "PREFIX : <http://onto.de/default#>\n" +
        "SELECT * WHERE {\n" +
        "  ?sub :isA :Human ;\n" +
        "  \t:livesIn ?obj .\n" +
        "  ?obj :isA :city ;\n" +
        "  \t:isLocatedIn :Germany .\n" +
        "}";
    setSparqlQuery(query);
};

const translateToOtherDomains = (sourceDomain, data) => {
    acceptingChanges = false;
    switch (sourceDomain) {
        case Domain.SPARQL:
            let graph = buildGraphFromQuery(data);
            updateLanguageEditor(data, graph);
            // by sending it to graph builder, source/target of edges will be the node objects instead of
            // just their ids, plus a few more things from the force-graph library
            setGraphBuilderData(graph.prefixes, Object.values(graph.nodes), graph.edges);
            break;
        case Domain.GRAPH:
            buildQueryFromGraph(data);
            setEditorValue("new value from GRAPH");
            break;
        case Domain.LANGUAGE:
            console.log("New value from editor to SPARQL and GRAPH: ", data);
            break;
    }
    acceptingChanges = true;
};

const buildGraphFromQuery = queryStr => {
    let queryJson = parser.parse(queryStr);
    let edges = [];
    let nodes = {};
    let queryType = queryJson.queryType;
    let variables = queryJson.variables.map(varObj => varObj.value);
    queryJson.where[0].triples.forEach(triple => {
        let subNode = addOrGetNode(nodes, triple.subject);
        let objNode = addOrGetNode(nodes, triple.object);
        edges.push({ id: edges.length, source: subNode.id, target: objNode.id, value: triple.predicate.value, type: triple.predicate.termType });
        // in this way from multiple same-direction edges between nodes, only one will be taken into account for computing the longest path
        // opposite-direction edges between same nodes lead to not-well defined behaviour as the alreadyOnPath-stopper kicks in, but not well defined TODO
        if (!subNode.children.includes(objNode)) {
            subNode.children.push(objNode);
        }
    });
    return { prefixes: queryJson.prefixes, nodes: nodes, edges: edges };
};

const addOrGetNode = (nodes, tripleEntity) => {
    let value = tripleEntity.value;
    if (!nodes[value]) {
        nodes[value] = { id: Object.keys(nodes).length, value: value, type: tripleEntity.termType, children: [] };
    }
    return nodes[value];
};

const buildQueryFromGraph = data => {
    let queryJson = {
        prefixes: data.prefixes,
        queryType: "SELECT",
        type: "query",
        variables: [{
            termType: "Wildcard",
            value: "*"
        }],
        where: [{
            type: "bgp",
            triples: data.triples
        }]
    };
    setSparqlQuery(generator.stringify(queryJson));
};

const updateLanguageEditor = (queryStr, graph) => {
    /*let queryJson = parser.parse(queryStr);
    let triples = queryJson.where[0].triples;
    triples.forEach(triple => triple.sharing = {});

    for (let a = 0; a < triples.length; a ++) {
        let tripleA = triples[a];
        setWord(tripleA.subject);
        setWord(tripleA.predicate);
        setWord(tripleA.object);
        for (let b = a + 1; b < triples.length; b ++) {
            let tripleB = triples[b];
            let subSame = tripleA.subject.value === tripleB.subject.value;
            let predSame = tripleA.predicate.value === tripleB.predicate.value;
            let objSame = tripleA.object.value === tripleB.object.value;
                // && tripleA.object.termType !== "Literal" && tripleB.object.termType !== "Literal";
            if (subSame && !predSame && !objSame) addSharingType(tripleA, tripleB, a, b,"sub");
            if (!subSame && predSame && !objSame) addSharingType(tripleA, tripleB, a, b,"pred");
            if (!subSame && !predSame && objSame) addSharingType(tripleA, tripleB, a, b,"obj");
            if (subSame && predSame && !objSame) addSharingType(tripleA, tripleB, a, b,"subPred");
            if (subSame && !predSame && objSame) addSharingType(tripleA, tripleB, a, b,"subObj");
            if (!subSame && predSame && objSame) addSharingType(tripleA, tripleB, a, b,"predObj");
        }
    }*/

    let longestPath = findLongestPath(graph);

    let sentence = "";
    for (let i = 0; i < longestPath.length; i++) {
        let element = longestPath[i];
        setWord(element); // deduplicate with triples above TODO
        sentence += " " + element.wordNormal;
        if (i === 2) {
            sentence += ", that";
        }
    }
    sentence = sentence.substr(1) + ".";
    setEditorValue(sentence);
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

const findLongestPath = graph => {
    let allPathsFromAllNodes = [];
    Object.values(graph.nodes).forEach(node => {
        let allPathsFromThisNode = [];
        walkFromHere(node, [], allPathsFromThisNode);
        allPathsFromAllNodes.push.apply(allPathsFromAllNodes, allPathsFromThisNode);
    });
    let longestPath = allPathsFromAllNodes.reduce((prev, current) => {
        return (prev.length > current.length) ? prev : current
    });
    let path = [graph.nodes[longestPath[0]]];
    for (let i = 0; i < longestPath.length - 1; i++) {
        let node = graph.nodes[longestPath[i]];
        let nextNode = graph.nodes[longestPath[i + 1]];
        let edgeBetween = graph.edges.filter(edge => edge.source === node.id && edge.target === nextNode.id)[0];
        path.push(edgeBetween);
        path.push(nextNode);
    }
    return path;
};


const walkFromHere = (node, path, allPaths) => {
    let alreadyOnPath = path.includes(node.value);
    path.push(node.value);
    if (alreadyOnPath || node.children.length === 0) {
        allPaths.push(path);
        return;
    }
    node.children.forEach(child => walkFromHere(child, path.slice(0), allPaths));
};

const addSharingType = (tripleA, tripleB, idxA, idxB, type) => {
    if (!tripleA.sharing[type]) tripleA.sharing[type] = [];
    if (!tripleB.sharing[type]) tripleB.sharing[type] = [];
    tripleA.sharing[type].push(idxB);
    tripleB.sharing[type].push(idxA);
};

export { initModel }
