import { buildGraph, updateGraphData } from './graph-shared';

let graph;
let nodes = [], edges = [];

const initGraphOutput = config => {
    graph = buildGraph(config);
    updateGraphData(graph, nodes, edges);
};

export { initGraphOutput }
