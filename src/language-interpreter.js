import CodeMirror from "codemirror";
import {} from "codemirror/addon/mode/simple";

let editor;
let termTypeHolders = ["text", "line"];

CodeMirror.defineSimpleMode("sparqlTermTypes", {
    start: [{
        regex: /\w+/, token: match => {
            if (termTypeHolders.includes(match[0].toLowerCase())) {
                return 'termTypeHolder';
            }
            return 'word'
        }}]
});

const initLanguageInterpreter = config => {
    config.div.style.border = "1px solid silver";
    editor = CodeMirror(config.div, {
        value: "some text in line one.\none some text in the second line.",
        mode:  "sparqlTermTypes",
        readOnly: "nocursor"
    });
};

const parseSentences = () => {
    let tokens = [];
    for (let i = 0; i < editor.getDoc().lineCount(); i ++) {
        tokens = [...tokens, ...editor.getLineTokens(i).filter(token => token.string.trim())];
    }
    let sentences = [];
    let oneSentence = [];
    tokens.forEach(token => {
        if (token.string === ".") {
            sentences.push(oneSentence);
            oneSentence = [];
        } else {
            oneSentence.push(token.string);
        }
    });
    if (oneSentence.length > 0) { // no dot at all or dangling words in the end without closing with a dot
        sentences.push(oneSentence);
    }
    return sentences;
};

const setEditorValue = value => {
    editor.setValue(value);
};

const onEditorChange = onChange => {
    editor.on("change", () => onChange(parseSentences()));
};

export { initLanguageInterpreter, onEditorChange, setEditorValue }
