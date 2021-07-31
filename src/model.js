import { onValidSparqlChange, setSparqlQuery } from './sparql-editor'
import { setGraphBuilderData, onValidGraphChange } from './graph-builder';
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

    let initialQuery = "SELECT * WHERE {\n ?sub ?pred ?obj .\n}";
    setSparqlQuery(initialQuery);
    translateToOtherDomains(Domain.SPARQL, initialQuery);
};

const translateToOtherDomains = (sourceDomain, data) => {
    acceptingChanges = false;
    switch (sourceDomain) {
        case Domain.SPARQL:
            buildGraphFromQuery(data);
            break;
        case Domain.GRAPH:
            buildQueryFromGraph(data);
            break;
        case Domain.LANGUAGE:
            break;
    }
    acceptingChanges = true;
};

const buildGraphFromQuery = queryStr => {
    let queryJson = parser.parse(queryStr);
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
    let queryStr = generator.stringify(queryJson);
    setSparqlQuery(queryStr);
};

export { initModel }
