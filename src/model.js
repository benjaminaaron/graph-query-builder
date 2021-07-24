import { onValidEditorChange, setQuery } from './sparql-editor'
import { setGraphBuilderData, onValidGraphChange } from './graph-builder';
const SparqlParser = require('sparqljs').Parser;
const parser = new SparqlParser();
const SparqlGenerator = require('sparqljs').Generator;
const generator = new SparqlGenerator({});

const initModel = () => {
    onValidEditorChange(queryStr => {
        buildGraphFromQuery(parser.parse(queryStr));
    });
    onValidGraphChange((prefixes, triples) => {
        buildQueryFromGraph(prefixes, triples);
    });
};

const buildGraphFromQuery = queryJson => {
    let edges = [];
    let nodes = {};
    let queryType = queryJson.queryType;
    let prefixes = queryJson.prefixes;
    let variables = queryJson.variables.map(varObj => varObj.value);
    queryJson.where[0].triples.forEach(triple => {
        let subId = addOrGetNode(nodes, triple.subject);
        let objId = addOrGetNode(nodes, triple.object);
        edges.push({ id: edges.length, source: subId, target: objId, name: triple.predicate.value, type: triple.predicate.termType });
    });
    setGraphBuilderData(Object.values(nodes), edges);
};

const addOrGetNode = (nodes, tripleEntity) => {
    let name = tripleEntity.value;
    if (!nodes[name]) {
        // termType can be: NamedNode, Variable, Literal
        nodes[name] = { id: Object.keys(nodes).length, name: name, type: tripleEntity.termType };
    }
    return nodes[name].id;
};

const buildQueryFromGraph = (nodesInfo, edgesInfo) => {
    console.log(nodesInfo, edgesInfo);

    let triples = [];
    edgesInfo.forEach(edge => {
        triples.push({
           subject: {
               termType: nodesInfo[edge.sourceId].type,
               value: nodesInfo[edge.sourceId].name
           },
           predicate: {
               termType: edge.type,
               value: edge.name
           },
           object: {
               termType: nodesInfo[edge.targetId].type,
               value: nodesInfo[edge.targetId].name
           }
        });
    });

    let queryJson = {
        prefixes: {},
        queryType: "SELECT",
        type: "query",
        variables: [{
            termType: "Wildcard",
            value: "*"
        }],
        where: [{
            type: "bgp",
            triples: triples
        }]
    };

    console.log(queryJson);
    let queryStr = generator.stringify(queryJson);
    console.log(queryStr);
    setQuery(queryStr);
};

export { initModel }
