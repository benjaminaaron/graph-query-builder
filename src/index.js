import { initGraphBuilder } from './graph-builder';
import { initSparqlEditor } from './sparql-editor';
import { initGraphOutput } from './graph-output';
import { initModel } from "./model";

window.init = config => {
    initGraphBuilder(config.graphBuilder);
    initSparqlEditor(config.sparqlEditor);
    initGraphOutput(config.graphOutput);
};
