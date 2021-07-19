import ForceGraph from 'force-graph';

const buildGraph = (graphDiv, width, height) => {
    let graph = ForceGraph()(graphDiv)
        .width(width)
        .height(height)
        .linkDirectionalArrowLength(6)
        .linkDirectionalArrowRelPos(1);
    let canvasEl = graphDiv.firstChild.firstChild;
    canvasEl.style.border = "1px solid silver";
    return graph;
};

const updateGraphData = (graph, nodes, edges) => {
    // TODO curvature
    graph.graphData({ nodes: nodes, links: edges });
};

export { buildGraph, updateGraphData }
