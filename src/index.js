import { initGraphBuilder } from './panels/graph-builder';
import { initSparqlEditor } from './panels/sparql-editor';
import { initLanguageInterpreter } from "./panels/language-interpreter";
import { initGraphOutput } from './panels/graph-output';
import { initModel } from "./model";

window.init = config => {
    initGraphBuilder(config.graphBuilder);
    initSparqlEditor(config.sparqlEditor);
    initLanguageInterpreter(config.languageInterpreter);
    initGraphOutput(config.graphOutput);
    initModel(config.outputElements);
};
