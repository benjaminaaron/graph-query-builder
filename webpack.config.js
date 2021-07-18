const path = require('path');

module.exports = {
    entry: './src/index.js',
    output: {
        filename: 'graph-query-visualizer.js',
        path: path.resolve(__dirname, 'dist'),
    },
    watch: true
};
