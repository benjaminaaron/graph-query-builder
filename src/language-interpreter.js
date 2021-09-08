import CodeMirror from "codemirror";
import {} from "codemirror/addon/mode/simple";

let editor;
let keywords = { NamedNode: [], Variable: [], Literal: [] };

CodeMirror.defineSimpleMode("sparqlTermTypes", {
    start: [{
        regex: /\w+/, token: match => {
            if (keywords.NamedNode.includes(match[0].toLowerCase())) {
                return 'namedNodeShort';
            }
            if (keywords.Variable.includes(match[0].toLowerCase())) {
                return 'variable';
            }
            if (keywords.Literal.includes(match[0].toLowerCase())) {
                return 'literal';
            }
            return 'word'
        }}]
});

const initLanguageInterpreter = config => {
    config.div.style.border = "1px solid silver";
    editor = CodeMirror(config.div, {
        value: "",
        mode:  "sparqlTermTypes",
        readOnly: true,
        lineWrapping: true
    });
};

const setEditorValue = (value, _keywords = { NamedNode: [], Variable: [], Literal: [] }) => {
    keywords = _keywords;
    editor.setValue(value);
};

const onEditorChange = onChange => {
    editor.on("keyup", (obj, event) => {
        if (event.key !== "Enter") {
            alert("Translating the natural language domain to the SPARQL and graph domain is not supported yet... or ever. Quite tough to get this right I imagine :)")
        }
    });
};

export { initLanguageInterpreter, onEditorChange, setEditorValue }
