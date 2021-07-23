import { buildGraph, updateGraphData } from './graph-shared';

// possible feature-rich alternative: https://github.com/wbkd/react-flow --> https://www.npmjs.com/package/react-flow-renderer

let graph;
let nodeIdCounter = 0, edgeIdCounter = 0;
let nodes = [], edges = [];
let dragSourceNode = null, interimEdge = null;
const SNAP_IN_DISTANCE = 15;
const SNAP_OUT_DISTANCE = 40;

const setGraphBuilderData = (_nodes, _edges) => {
    nodes = _nodes;
    edges = _edges;
    nodeIdCounter = nodes.length;
    edgeIdCounter = edges.length;
    update();
};

const update = () => {
    updateGraphData(graph, nodes, edges);
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
    update();
};

const setInterimEdge = (source, target) => {
    let edgeId = edgeIdCounter ++;
    interimEdge = { id: edgeId, source: source, target: target, name: 'edge_' + edgeId };
    edges.push(interimEdge);
    update();
};

const removeEdge = edge => {
    edges.splice(edges.indexOf(edge), 1);
};

const removeInterimEdgeWithoutAddingIt = () => {
    removeEdge(interimEdge);
    interimEdge = null;
    update();
};

const removeNode = node => {
    edges.filter(edge => edge.source === node || edge.target === node).forEach(edge => removeEdge(edge));
    nodes.splice(nodes.indexOf(node), 1);
};

const initGraphBuilder = config => {
    graph = buildGraph(config)
        .onNodeDrag(dragNode => {
            dragSourceNode = dragNode;
            for (let node of nodes) {
                if (dragNode === node) {
                    continue;
                }
                // close enough: snap onto node as target for suggested edge
                if (!interimEdge && distance(dragNode, node) < SNAP_IN_DISTANCE) {
                    setInterimEdge(dragSourceNode, node);
                }
                // close enough to other node: snap over to other node as target for suggested edge
                if (interimEdge && node !== interimEdge.target && distance(dragNode, node) < SNAP_IN_DISTANCE) {
                    removeEdge(interimEdge);
                    setInterimEdge(dragSourceNode, node);
                }
            }
            // far away enough: snap out of the current target node
            if (interimEdge && distance(dragNode, interimEdge.target) > SNAP_OUT_DISTANCE) {
                removeInterimEdgeWithoutAddingIt();
            }
        })
        .onNodeDragEnd(() => {
            dragSourceNode = null;
            interimEdge = null;
            update();
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
            let nodeId = nodeIdCounter ++;
            nodes.push({ id: nodeId, x: coords.x, y: coords.y, name: 'node_' + nodeId });
            update();
        });
    update();
}

export { initGraphBuilder, setGraphBuilderData }
