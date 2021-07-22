import Yasgui from "@triply/yasgui";

let yasgui;

const initSparqlEditor = editorDiv => {
    yasgui = new Yasgui(editorDiv);
    // make sure only one tab is open
    let tab;
    while (tab = yasgui.getTab()) {
        tab.close();
    }
    tab = yasgui.addTab(true, {});
    tab.setQuery("SELECT * WHERE {\n ?sub ?pred ?obj .\n}");

    let yasqe = yasgui.getTab().getYasqe();
    // can't be found via IDE in Yasgui lib, but is there via CodeMirror dependency
    console.log(yasqe.getLineTokens(0)); // via https://discuss.codemirror.net/t/how-can-i-traverse-through-tokens/81/2
    let linesCount = yasqe.getDoc().children[0].lines.length;
    // ...
};

export { initSparqlEditor }
