import { onValidEditorChange } from './sparql-editor'
const SparqlParser = require('sparqljs').Parser;
const parser = new SparqlParser();

let queryModel;
let graphModel;

const initModel = () => {
    onValidEditorChange(queryStr => {
        buildGraphFromQuery(parser.parse(queryStr));
    });
    // onGraphChange(graph => {});
};

const buildGraphFromQuery = queryModel => {
    let queryType = queryModel.queryType;
    let prefixes = queryModel.prefixes;
    let variables = queryModel.variables.map(varObj => varObj.value);
    queryModel.where[0].triples.forEach(triple => {
        let sub = triple.subject;
        let pred = triple.predicate;
        let obj = triple.object;

        // TODO
    });
};

const buildQueryFromGraph = graphModel => {
   // TODO
};

export { initModel }
