import ForceGraph from 'force-graph';

const buildGraph = config => {
    let graph = ForceGraph()(config.div)
        .width(config.width)
        .height(config.height)
        .nodeLabel('tooltip')
        .linkLabel('tooltip')
        .linkDirectionalArrowLength(4)
        .linkDirectionalArrowRelPos(0.9)
        .linkCurvature('curvature');
    let canvasEl = config.div.firstChild.firstChild;
    canvasEl.style.border = "1px solid silver";
    return graph;
};

const updateGraphData = (graph, nodes, edges) => {
    computeEdgeCurvatures(edges);
    graph.graphData({ nodes: nodes, links: edges });
};

const CURVATURE_MIN_MAX = 0.5;

const computeEdgeCurvatures = edges => {
    let selfLoopEdges = {};
    let sameNodesEdges = {};

    // 1. assign each edge a nodePairId that combines their source and target independent of the edge-direction
    // 2. group edges together that share the same two nodes or are self-loops
    edges.forEach(edge => {
        let sourceId = edge.source.id === undefined ? edge.source : edge.source.id;
        let targetId = edge.target.id === undefined ? edge.target : edge.target.id;
        edge.nodePairId = sourceId <= targetId ? (sourceId + "_" + targetId) : (targetId + "_" + sourceId);
        edge.curvature = null; // reset all in case they had values
        let map = edge.source === edge.target ? selfLoopEdges : sameNodesEdges;
        if (!map[edge.nodePairId]) {
            map[edge.nodePairId] = [];
        }
        map[edge.nodePairId].push(edge);
    });

    // TODO the graph-builder UI doesn't support creating self-loops yet
    // Compute the curvature for self-loop edges to avoid overlaps
    Object.keys(selfLoopEdges).forEach(id => {
        let edges = selfLoopEdges[id];
        let lastIndex = edges.length - 1;
        edges[lastIndex].curvature = 1;
        let delta = (1 - CURVATURE_MIN_MAX) / lastIndex;
        for (let i = 0; i < lastIndex; i++) {
            edges[i].curvature = CURVATURE_MIN_MAX + i * delta;
        }
    });

    // Compute the curvature for edges sharing the same two nodes to avoid overlaps
    Object.keys(sameNodesEdges).filter(nodePairId => sameNodesEdges[nodePairId].length > 1).forEach(nodePairId => {
        let edges = sameNodesEdges[nodePairId];
        let lastIndex = edges.length - 1;
        let lastEdge = edges[lastIndex];
        lastEdge.curvature = CURVATURE_MIN_MAX;
        let delta = 2 * CURVATURE_MIN_MAX / lastIndex;
        for (let i = 0; i < lastIndex; i++) {
            edges[i].curvature = - CURVATURE_MIN_MAX + i * delta;
            if (lastEdge.source !== edges[i].source) {
                edges[i].curvature *= -1; // flip it around, otherwise they overlap
            }
        }
    });
};

export { buildGraph, updateGraphData }
