import { onValidEditorChange } from './sparql-editor'
import { setGraphBuilderData, onGraphChange } from './graph-builder';
const SparqlParser = require('sparqljs').Parser;
const parser = new SparqlParser();

const initModel = () => {
    onValidEditorChange(queryStr => {
        buildGraphFromQuery(parser.parse(queryStr));
    });
    onGraphChange((nodesInfo, edgesInfo) => {
        buildQueryFromGraph(nodesInfo, edgesInfo);
    });
};

const buildGraphFromQuery = queryModel => {
    let edges = [];
    let nodes = {};
    let queryType = queryModel.queryType;
    let prefixes = queryModel.prefixes;
    let variables = queryModel.variables.map(varObj => varObj.value);
    queryModel.where[0].triples.forEach(triple => {
        let subId = addOrGetNode(nodes, triple.subject);
        let objId = addOrGetNode(nodes, triple.object);
        edges.push({ id: edges.length, source: subId, target: objId, name: getName(triple.predicate), type: triple.predicate.termType });
    });
    setGraphBuilderData(Object.values(nodes), edges);
};

const addOrGetNode = (nodes, tripleEntity) => {
    let name = getName(tripleEntity);
    if (!nodes[name]) {
        // termType can be: NamedNode, Variable, Literal
        nodes[name] = { id: Object.keys(nodes).length, name: name, type: tripleEntity.termType };
    }
    return nodes[name].id;
};

const getName = entity => {
    if (entity.termType === "Variable") {
        return '?' + entity.value;
    }
    return entity.value;
};

const buildQueryFromGraph = (nodesInfo, edgesInfo) => {
    console.log(nodesInfo, edgesInfo);
   // TODO
};

export { initModel }
