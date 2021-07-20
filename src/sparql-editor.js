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
};

export { initSparqlEditor }
