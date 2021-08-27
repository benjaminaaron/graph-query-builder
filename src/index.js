import { initGraphBuilder } from './graph-builder';
import { initSparqlEditor } from './sparql-editor';
import { initLanguageInterpreter } from "./language-interpreter";
import { initGraphOutput } from './graph-output';
import { initModel } from "./model";

window.init = config => {
    initGraphBuilder(config.graphBuilder);
    initSparqlEditor(config.sparqlEditor);
    initLanguageInterpreter(config.languageInterpreter);
    initGraphOutput(config.graphOutput);
    initModel(config.submitButtonId);
};
