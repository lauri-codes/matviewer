import { StructureViewer } from './structureviewer.js';
// Structure
var structure = {
    "atomicNumbers": [11, 17, 11, 17, 11, 17, 11, 17],
    "cell": [
        [5.6402, 0.0, 0.0],
        [0.0, 5.6402, 0.0],
        [0.0, 0.0, 5.6402]
    ],
    "scaledPositions": [
        [0.0, 0.5, 0.0],
        [0.0, 0.5, 0.5],
        [0.0, 0.0, 0.5],
        [0.0, 0.0, 0.0],
        [0.5, 0.5, 0.5],
        [0.5, 0.5, 0.0],
        [0.5, 0.0, 0.0],
        [0.5, 0.0, 0.5]
    ],
    "primitiveCell": [
        [0.0, 2.8201, 2.8201],
        [2.8201, 0.0, 2.8201],
        [2.8201, 2.8201, 0.0]
    ],
    "pbc": [true, true, true]
};
// Find the element in which the visualizer will be enbedded into
let targetElem = document.getElementById("visualizationCanvas");
// Viewer options
let options = {
    showParam: true,
    showCopies: false,
    showShadows: true,
    showTags: true,
    allowRepeat: false,
    showCell: true,
    wrap: false,
    showLegend: true,
    showOptions: true,
    showUnit: true,
    showBonds: true,
    radiusScale: 0.8,
    bondScale: 1.2,
    enableZoom: true,
    enablePan: true,
    enableRotate: true,
    autoResize: true,
    zoomLevel: 1,
};
// Initialize viewer and load structure
var viewer = new StructureViewer(targetElem, options);
viewer.load(structure);
