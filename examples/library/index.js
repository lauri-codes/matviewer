// Find the element in which the visualizer will be enbedded into
let targetElem = document.getElementById("visualizationCanvas");

// Viewer options
let options = {
    showParam: true,    // Show lattice parameters
    showCopies: false,  // Show periodic copies at cell boundary
    showShadows: true,  // Enable shadows: requires a bit more from GPU
    showTags: true,     // Allow repeating the structure
    allowRepeat: false, // 
    showCell: true,     // Show unit cell wireframe
    wrap: false,        // Wrap atoms to unit cell
    showLegend: true,   // Show atom labels
    showOptions: true,  // Show the options toolbar
    showUnit: true,     // Show the options toolbar
    showBonds: true,    // Enable automatically detected bonds
    radiusScale: 0.8,   // Scaling factor for atomic radii
    bondScale: 1.2,     // Scaling factor for the automatic bond detection
    enableZoom: true,   // Enable zoom with mouse wheel/pinch
    enablePan: true,    // Enable pan with mouse/touch
    enableRotate: true, // Enable rotation
    autoResize: true,   // Enable automatic visualization resizing to fit canvas
    zoomLevel: 1,       // Default zoom level
};

// Initialize viewer and load structure
var viewer = new matviewer.StructureViewer(targetElem, options);

// Define structure and load it into the viewer it
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
viewer.load(structure);
