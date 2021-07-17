// wrapper adapted from https://github.com/steverydz/build-url/blob/master/src/build-url.js: to support usage with browser, ES6 modules and node
;(function () {
    let str = "";

    const main = {
        foo: "bar",
        setStr: s => {
            str = s;
        },
        getStr: () => {
            return str;
        }
    };

    if (typeof(exports) !== 'undefined') {
        if (typeof(module) !== 'undefined' && module.exports) {
            exports = module.exports = main;
        }
        exports.main = main;
    } else {
        this.main = main;
    }
}).call(this);
