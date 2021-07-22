import Yasgui from "@triply/yasgui";

let yasgui, yasqe;

const initSparqlEditor = editorDiv => {
    yasgui = new Yasgui(editorDiv);
    // make sure only one tab is open
    let tab;
    while (tab = yasgui.getTab()) {
        tab.close();
    }
    tab = yasgui.addTab(true, {});
    tab.setQuery("SELECT * WHERE {\n ?sub ?pred ?obj .\n}");
    yasqe = yasgui.getTab().getYasqe();
};

const setQuery = query => {
    yasgui.getTab().setQuery(query);
};

const getQuery = () => {
    return yasgui.getTab().getQuery();
};

const onValidEditorChange = onChange => {
    yasqe.on("change", e => {
        if (yasqe.queryValid) {
            onChange(getQuery());
        }
    });
};

export { initSparqlEditor, setQuery, getQuery, onValidEditorChange }
