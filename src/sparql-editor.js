import Yasgui from "@triply/yasgui";

let yasgui, yasqe;

const initSparqlEditor = config => {
    yasgui = new Yasgui(config.div, {}); // TODO config --> much more lightweight
    // make sure only one tab is open
    let tab;
    while (tab = yasgui.getTab()) { tab.close(); }
    yasgui.addTab(true, {});
    yasqe = yasgui.getTab().getYasqe();
};

const setQuery = query => {
    skipOnChangeCallbackOnce = true;
    yasgui.getTab().setQuery(query);
};

let skipOnChangeCallbackOnce = false;

const onValidSparqlChange = onChange => {
    yasqe.on("change", () => {
        if (skipOnChangeCallbackOnce) {
            skipOnChangeCallbackOnce = false;
            return;
        }
        if (yasqe.queryValid) {
            onChange(yasgui.getTab().getQuery());
        }
    });
};

export { initSparqlEditor, setSparqlQuery, onValidSparqlChange }
