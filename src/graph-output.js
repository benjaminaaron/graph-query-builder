import { buildGraph, updateGraphData } from './graph-shared';

let graph;
let nodeIdCounter = 0, edgeIdCounter = 0;
let nodes = [], edges = [];

const setGraphOutputData = graphData => {
    // TODO
};

const initGraphOutput = config => {
    graph = buildGraph(config);
    updateGraphData(graph, nodes, edges);
};

export { initGraphOutput, setGraphOutputData }
