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
    graphChanged();
    update();
};

const setInterimEdge = (source, target) => {
    let edgeId = edgeIdCounter ++;
    interimEdge = { id: edgeId, source: source, target: target, name: 'edge_' + edgeId, type: "Variable" };
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
    graphChanged();
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
            if (interimEdge) {
                graphChanged();
            }
            interimEdge = null;
            update();
        })
        .linkColor(edge => getColorForType(edge === interimEdge ? 'IN_DRAGGING' : edge.type))
        .linkLineDash(edge => edge === interimEdge ? [2, 2] : [])
        .onNodeClick((node, event) => rename(node, 'node'))
        .onNodeRightClick((node, event) => removeNode(node))
        .onLinkClick((edge, event) => rename(edge, 'edge'))
        .onLinkRightClick((edge, event) => {
            removeEdge(edge);
            graphChanged();
        })
        .onBackgroundClick(event => {
            let coords = graph.screen2GraphCoords(event.layerX, event.layerY);
            let nodeId = nodeIdCounter ++;
            nodes.push({ id: nodeId, x: coords.x, y: coords.y, name: 'node_' + nodeId, type: "Variable" });
            update();
        })
        .nodeCanvasObject((node, ctx, globalScale) => {
            const fontSize = 18 / globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            const textWidth = ctx.measureText(node.name).width;
            const rectDim = [textWidth, fontSize].map(n => n + fontSize * 0.8); // padding
            ctx.fillStyle = getColorForType(node === dragSourceNode || (interimEdge && (node === interimEdge.source || node === interimEdge.target)) ? 'IN_DRAGGING' : node.type);
            ctx.fillRect(node.x - rectDim[0] / 2, node.y - rectDim[1] / 2, ...rectDim);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'white';
            ctx.fillText(node.name, node.x, node.y);
        });
    update();
};

const getColorForType = type => {
    switch (type) {
        case 'NamedNode':
          return '#337a4d';
        case 'Literal':
          return '#912419';
        case 'IN_DRAGGING':
          return 'orange';
        case 'Variable':
        default:
          return 'rgba(31, 120, 180, 0.92)';
    }
    // ForceGraph default colors:
        // edge: rgba(255,255,255,0.2)
        // node: rgba(31, 120, 180, 0.92)
    // Yasgui editor colors:
        // NamedNode #337a4d
        // Literal #912419
        // Variable #1d158b
        // curly brackets: #4aae23 (selected, otherwise black)
        // keywords: #62167a
};

const graphChanged = () => {
    if (!graphChangeCallback) {
        return;
    }
    let edgesInfo = [];
    let nodesInfo = {};
    let connectedNodeIds = new Set();
    edges.forEach(edge => {
        connectedNodeIds.add(edge.source.id);
        connectedNodeIds.add(edge.target.id);
        edgesInfo.push({ sourceId: edge.source.id, targetId: edge.target.id, name: edge.name })
    });
    nodes.filter(node => connectedNodeIds.has(node.id)).forEach(node => nodesInfo[node.id] = node.name);
    graphChangeCallback(nodesInfo, edgesInfo);
};

let graphChangeCallback;

const onGraphChange = callback => {
    graphChangeCallback = callback;
};

export { initGraphBuilder, setGraphBuilderData, onGraphChange }
