import { SparqlEndpointFetcher } from "fetch-sparql-endpoint";

const sparqlEndpointFetcher = new SparqlEndpointFetcher();
const SPARQL_ENDPOINT = "http://localhost:7200/repositories/onto-engine";

async function querySparqlEndpoint(query, onResults) {
    const bindingsStream = await sparqlEndpointFetcher.fetchBindings(SPARQL_ENDPOINT, query);
    let variables;
    let data = [];
    bindingsStream.on('variables', vars => variables = vars);
    bindingsStream.on('data', bindings => data.push(bindings));
    bindingsStream.on('end', () => onResults(variables, data));
}

const fetchAllTriplesFromEndpoint = (prefixes, done) => {
    querySparqlEndpoint("SELECT * WHERE { ?s ?p ?o }", (variables, data) => {
        let nodes = {};
        let edges = [];
        data.forEach(triple => {
            let subNode = addOrGetNode(nodes, triple.s);
            let objNode = addOrGetNode(nodes, triple.o);
            addEdge(edges, triple.p, subNode.id, objNode.id);
        });
        done({ prefixes: prefixes, nodes: nodes, edges: edges });
    }).then();
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

const extractWordFromUri = uri => {
    if (uri.includes('#')) {
        return uri.split('#')[1];
    }
    let parts = uri.split('/');
    return parts[parts.length - 1];
};

const buildShortFormIfPrefixExists = (prefixes, fullUri) => {
    let ret = fullUri;
    Object.entries(prefixes).forEach(([short, uri]) => {
        if (fullUri.startsWith(uri)) {
            ret = short + ":" + fullUri.substr(uri.length);
        }
    });
    return ret;
};

export { querySparqlEndpoint, fetchAllTriplesFromEndpoint, parseTriples, extractWordFromUri, buildShortFormIfPrefixExists }
