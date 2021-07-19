import { buildGraph, updateGraphData } from './graph-shared';

let graph;
let nodes = [], edges = [];

const initGraphOutput = (graphDiv, width, height) => {
    graph = buildGraph(graphDiv, width, height);
    updateGraphData(graph, nodes, edges);
};

export { initGraphOutput }
