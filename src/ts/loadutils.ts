/*
 * Utility function for loading JSON files from local host.
 */
export function loadJSON(url, success, error)
{
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function()
    {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            if (xhr.status === 200) {
                if (success)
                    return success(JSON.parse(xhr.responseText));
            } else {
                if (error)
                    error(url, xhr);
            }
        }
    };
    xhr.open("GET", url, true);
    xhr.send();
}

/*
 * Callback function for loading errors.
 */
export function loadError(path, xhr) {
    console.log("Error in loading JSON from path " + path + ":" + xhr)
}
