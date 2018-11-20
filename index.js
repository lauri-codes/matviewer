"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const structureviewer = require("./build/js/structureviewer");

let targetElem = document.getElementById("visualizationCanvas");
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
    radiusScale: 1
};
var viewer = new structureviewer.StructureViewer(targetElem, false, options);
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

var structure = {
    "atomicNumbers": [6, 6, 6, 6, 8, 6, 6, 7, 8, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    "positions": [
        [-1.46642873,  2.12355439,  1.51187892],
        [-1.05739735,  0.65363176,  1.71856894],
        [-0.26527093,  0.08080389,  0.6016453 ],
        [ 1.01063218, -0.36712643,  0.47504551],
        [ 1.92714107, -0.37840813,  1.48590876],
        [ 1.20688378, -0.79389164, -0.88558497],
        [ 0.00961026, -0.56947955, -1.49892279],
        [-0.47154862, -0.83958273, -2.77287556],
        [-0.8870068,  -0.04665441, -0.64071879],
        [-0.58409823,  2.76322113,  1.41267063],
        [-2.06555839,  2.23483597,  0.60314244],
        [-2.06143877,  2.48644712,  2.35628087],
        [-0.44770995,  0.5593292,   2.62330382],
        [-1.96126087,  0.05159782,  1.88894857],
        [ 2.71172469, -0.84255666,  1.18227085],
        [ 2.10136812, -1.20316852, -1.32860442],
        [ 0.25669424, -0.85584254, -3.47337018],
        [-1.214255,   -0.20721496, -3.04355315]
    ],
    "pbc": [false, false, false],
    "cell": [
        [5.6402, 0.0, 0.0],
        [0.0, 5.6402, 0.0],
        [0.0, 0.0, 5.6402]
    ]
};
viewer.load(structure);
