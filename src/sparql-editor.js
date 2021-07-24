import Yasgui from "@triply/yasgui";

let yasgui, yasqe;

const initSparqlEditor = config => {
    yasgui = new Yasgui(config.div, {}); // TODO config --> much more lightweight
    // make sure only one tab is open
    let tab;
    while (tab = yasgui.getTab()) { tab.close(); }
    tab = yasgui.addTab(true, {});
    tab.setQuery("SELECT * WHERE {\n ?sub ?pred ?obj .\n}");
    yasqe = yasgui.getTab().getYasqe();
};

const setQuery = query => {
    skipOnChangeCallbackOnce = true;
    yasgui.getTab().setQuery(query);
};

const getQuery = () => {
    return yasgui.getTab().getQuery();
};

let skipOnChangeCallbackOnce = false;

const onValidEditorChange = onChange => {
    yasqe.on("change", () => {
        if (skipOnChangeCallbackOnce) {
            skipOnChangeCallbackOnce = false;
            return;
        }
        if (yasqe.queryValid) {
            onChange(getQuery());
        }
    });
};

export { initSparqlEditor, setQuery, getQuery, onValidEditorChange }
