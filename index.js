"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const structureviewer = require("./build/js/structureviewer");

let targetElem = document.getElementById("visualizationCanvas");
let options = {
    showParam: true,
    showCopies: false,
    showTags: true,
    allowRepeat: true,
    showCell: true,
    wrap: false,
    showLegend: true,
    showOptions: true,
    showUnit: true
};
var viewer = new structureviewer.StructureViewer(targetElem, false, options);
var structure = {
    "labels": [11, 17, 11, 17, 11, 17, 11, 17],
    "normalizedCell": [
        [5.6402, 0.0, 0.0],
        [0.0, 5.6402, 0.0],
        [0.0, 0.0, 5.6402]
    ],
    "positions": [
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
    "periodicity": [true, true, true]
};
viewer.load(structure);
