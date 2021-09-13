import { buildGraph, updateGraphData } from '../graph-shared';
import { buildShortFormIfPrefixExists } from "../utils";

let graph;
let nodes = [], edges = [];

const setGraphOutputData = graphData => {
    nodes = Object.values(graphData.nodes);
    edges = graphData.edges;
    nodes.forEach(node => setLabelAndTooltip(graphData.prefixes, node));
    edges.forEach(edge => setLabelAndTooltip(graphData.prefixes, edge));
    updateGraphData(graph, nodes, edges);
};

const highlightGraphOutputSubset = graphData => {
    // TODO
};

const setLabelAndTooltip = (prefixes, nodeOrEdge) => {
    let shortForm = buildShortFormIfPrefixExists(prefixes, nodeOrEdge.value);
    nodeOrEdge.tooltip = shortForm;
    nodeOrEdge.label = shortForm;
};

const initGraphOutput = config => {
    graph = buildGraph(config);
    updateGraphData(graph, nodes, edges);
};

export { initGraphOutput, setGraphOutputData, highlightGraphOutputSubset }
