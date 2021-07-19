import ForceGraph from 'force-graph';

let nodeIdCounter = 0, edgeIdCounter = 0;
let nodes = [], edges = [];
let dragSourceNode = null, interimEdge = null;
const snapInDistance = 15;
const snapOutDistance = 40;

const updateGraphData = () => {
    graph.graphData({ nodes: nodes, links: edges });
};

const distance = (node1, node2) => {
    return Math.sqrt(Math.pow(node1.x - node2.x, 2) + Math.pow(node1.y - node2.y, 2));
};

const rename = (nodeOrEdge, type) => {
    let value = prompt('Name this ' + type + ':', nodeOrEdge.name);
    if (!value) {
        return;
    }
    nodeOrEdge.name = value;
    updateGraphData();
};

const setInterimEdge = (source, target) => {
    let edgeId = edgeIdCounter ++;
    interimEdge = { id: edgeId, source: source, target: target, name: 'edge_' + edgeId };
    edges.push(interimEdge);
    updateGraphData();
};

const removeEdge = edge => {
    edges.splice(edges.indexOf(edge), 1);
};

const removeInterimEdgeWithoutAddingIt = () => {
    removeEdge(interimEdge);
    interimEdge = null;
    updateGraphData();
};

const removeNode = node => {
    edges.filter(edge => edge.source === node || edge.target === node).forEach(edge => removeEdge(edge));
    nodes.splice(nodes.indexOf(node), 1);
};

let graph;

const init = (graphDiv, width, height) => {
    graph = ForceGraph()(graphDiv)
        .width(width)
        .height(height)
        .linkDirectionalArrowLength(6)
        .linkDirectionalArrowRelPos(1)
        .onNodeDrag(dragNode => {
            dragSourceNode = dragNode;
            for (let node of nodes) {
                if (dragNode === node) {
                    continue;
                }
                // close enough: snap onto node as target for suggested edge
                if (!interimEdge && distance(dragNode, node) < snapInDistance) {
                    setInterimEdge(dragSourceNode, node);
                }
                // close enough to other node: snap over to other node as target for suggested edge
                if (interimEdge && node !== interimEdge.target && distance(dragNode, node) < snapInDistance) {
                    removeEdge(interimEdge);
                    setInterimEdge(dragSourceNode, node);
                }
            }
            // far away enough: snap out of the current target node
            if (interimEdge && distance(dragNode, interimEdge.target) > snapOutDistance) {
                removeInterimEdgeWithoutAddingIt();
            }
        })
        .onNodeDragEnd(() => {
            dragSourceNode = null;
            interimEdge = null;
            updateGraphData();
        })
        .nodeColor(node => node === dragSourceNode || (interimEdge && (node === interimEdge.source || node === interimEdge.target)) ? 'orange' : null)
        .linkColor(edge => edge === interimEdge ? 'orange' : '#bbbbbb')
        .linkLineDash(edge => edge === interimEdge ? [2, 2] : [])
        .onNodeClick((node, event) => rename(node, 'node'))
        .onNodeRightClick((node, event) => removeNode(node))
        .onLinkClick((edge, event) => rename(edge, 'edge'))
        .onLinkRightClick((edge, event) => removeEdge(edge))
        .onBackgroundClick(event => {
            let coords = graph.screen2GraphCoords(event.layerX, event.layerY);
            let nodeId = nodeIdCounter++;
            nodes.push({id: nodeId, x: coords.x, y: coords.y, name: 'node_' + nodeId});
            updateGraphData();
        });
    updateGraphData();
    let canvasEl = graphDiv.firstChild.firstChild;
    canvasEl.style.border = "1px solid silver";
}

export { init }
