import { onValidEditorChange } from './sparql-editor'

let queryModel;
let graphModel;

const initModel = () => {
    onValidEditorChange(queryStr => {
        console.log(queryStr);
    });
    // onGraphChange(graph => {});
};

export { initModel }
