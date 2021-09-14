import { buildGraph, updateGraphData } from '../graph-shared';
import { buildShortFormIfPrefixExists } from "../utils";

let graph;
let nodes = [], edges = [];

const setGraphOutputData = graphData => {
    nodes = graphData.nodes;
    edges = graphData.edges;
    nodes.forEach(node => setLabelAndTooltip(graphData.prefixes, node));
    edges.forEach(edge => setLabelAndTooltip(graphData.prefixes, edge));
    updateGraphData(graph, nodes, edges);
};

const highlightGraphOutputSubset = graphData => {
    let triplesToHighlight = edges.filter(edge => containsSameTriple(edge, graphData));

    // TODO
};

const containsSameTriple = (thisEdge, otherGraphData) => {
    // can this be achieved in a better way?
    let thisEdgeValue = thisEdge.value;
    let thisSourceValue = nodes[thisEdge.source.id].value;
    let thisTargetValue = nodes[thisEdge.target.id].value;
    let otherNodes = otherGraphData.nodes;
    let otherEdges = otherGraphData.edges;
    for (let i = 0; i < otherEdges.length; i++) {
        let otherEdgeValue = otherEdges[i].value;
        let otherSourceValue = otherNodes[otherEdges[i].source].value;
        let otherTargetValue = otherNodes[otherEdges[i].target].value;
        if (thisEdgeValue === otherEdgeValue && thisSourceValue === otherSourceValue && thisTargetValue === otherTargetValue) {
            return true;
        }
    }
    return false;
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
