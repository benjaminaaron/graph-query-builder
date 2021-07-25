const path = require('path');
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
    entry: './src/index.js',
    mode: 'development',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
    },
    // watch: true
    plugins: [
        new CopyPlugin({
            patterns: [
                {
                    from: "./node_modules/@triply/yasgui/build/yasgui.min.css",
                    to: "yasgui.min.css"
                },
            ],
        }),
    ]
};
