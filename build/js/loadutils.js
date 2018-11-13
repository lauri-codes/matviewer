System.register([], function (exports_1, context_1) {
    "use strict";
    var __moduleName = context_1 && context_1.id;
    /*
     * Utility function for loading JSON files from local host.
     */
    function loadJSON(url, success, error) {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function () {
            if (xhr.readyState === XMLHttpRequest.DONE) {
                if (xhr.status === 200) {
                    if (success)
                        return success(JSON.parse(xhr.responseText));
                }
                else {
                    if (error)
                        error(url, xhr);
                }
            }
        };
        xhr.open("GET", url, true);
        xhr.send();
    }
    exports_1("loadJSON", loadJSON);
    /*
     * Callback function for loading errors.
     */
    function loadError(path, xhr) {
        console.log("Error in loading JSON from path " + path + ":" + xhr);
    }
    exports_1("loadError", loadError);
    return {
        setters: [],
        execute: function () {
        }
    };
});
