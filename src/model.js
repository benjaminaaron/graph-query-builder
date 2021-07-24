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
        edges.push({ id: edges.length, source: subId, target: objId, value: triple.predicate.value, type: triple.predicate.termType });
    });
    setGraphBuilderData(prefixes, Object.values(nodes), edges);
};

const addOrGetNode = (nodes, tripleEntity) => {
    let value = tripleEntity.value;
    if (!nodes[value]) {
        nodes[value] = { id: Object.keys(nodes).length, value: value, type: tripleEntity.termType };
    }
    return nodes[value].id;
};

const buildQueryFromGraph = (prefixes, triples) => {
    let queryJson = {
        prefixes: prefixes,
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
    let queryStr = generator.stringify(queryJson);
    setQuery(queryStr);
};

export { initModel }
