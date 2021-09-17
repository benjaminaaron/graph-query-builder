import { buildGraph, updateGraphData, getColorForType } from '../graph-shared';
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
    // reset highlighting
    nodes.forEach(node => node.highlightAsType = null);
    edges.forEach(edge => edge.highlightAsType = null);
    if (graphData) {
        edges.forEach(edge => markForHighlighting(edge, graphData));
    }
    graph.graphData({ nodes: nodes, links: edges });
};

const markForHighlighting = (thisEdge, otherGraphData) => {
    // can this be achieved in a better way?
    let thisSource = nodes[thisEdge.source.id];
    let thisTarget = nodes[thisEdge.target.id];
    let otherNodes = otherGraphData.nodes;
    let otherEdges = otherGraphData.edges;
    for (let i = 0; i < otherEdges.length; i++) {
        let otherEdge = otherEdges[i];
        let otherSource = otherNodes[otherEdge.source];
        let otherTarget = otherNodes[otherEdge.target];
        if (thisEdge.value === otherEdge.value && thisSource.value === otherSource.value && thisTarget.value === otherTarget.value) {
            thisEdge.highlightAsType = otherEdge.wasVariable ? 'Variable' : otherSource.type;
            // some nodes will be marked twice like this, but that's ok
            thisSource.highlightAsType = otherSource.wasVariable ? 'Variable' : otherSource.type;
            thisTarget.highlightAsType = otherTarget.wasVariable ? 'Variable' : otherTarget.type;
        }
    }
};

const setLabelAndTooltip = (prefixes, nodeOrEdge) => {
    let shortForm = buildShortFormIfPrefixExists(prefixes, nodeOrEdge.value);
    nodeOrEdge.tooltip = shortForm;
    nodeOrEdge.label = shortForm;
};

const initGraphOutput = config => {
    graph = buildGraph(config)
        .linkColor(edge => edge.highlightAsType ? getColorForType(edge.highlightAsType) : getColorForType())
        .nodeColor(node => node.highlightAsType ? getColorForType(node.highlightAsType) : getColorForType())
    updateGraphData(graph, nodes, edges);
};

export { initGraphOutput, setGraphOutputData, highlightGraphOutputSubset }
