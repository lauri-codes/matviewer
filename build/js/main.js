System.register(["./structureviewer"], function (exports_1, context_1) {
    "use strict";
    var structureviewer_1, targetElement, options, viewer;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [
            function (structureviewer_1_1) {
                structureviewer_1 = structureviewer_1_1;
            }
        ],
        execute: function () {
            targetElement = document.getElementById("canvas");
            options = {
                showParam: false,
                showCopies: false,
                showTags: true,
                allowRepeat: false,
                showCell: true,
                wrap: false,
                showLegend: false,
                showOptions: false,
                showUnit: true
            };
            viewer = new structureviewer_1.StructureViewer(targetElement, false, options);
        }
    };
});
