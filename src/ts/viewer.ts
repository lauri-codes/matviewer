declare let THREE;

/**
 * Abstract base class for visualizing 3D scenes with three.js.
 */
export abstract class Viewer {
    camera:any;                           // three.js camera
    renderer:any;                         // three.js renderer object
    controls:any;                         // Controller object for handling mouse interaction with the system
    scene:any;                            // The default scene
    scenes:any[] = [];                    // A list of scenes that are rendered
    cornerPoints:any;                     // A list of 3D positions that are used to fit the scene within the window.
    cameraWidth:number = 10.0;            // The default "width" of the camera
    fitMargin:number = 0.5;               // The margin that is left between the cell corners and the screen edge in pixels
    rootElement:any;                      // A root html element that contains all visualization components
    options:object = {};                          // Options for the viewer. Can be e.g. used to control which settings are enabled

    /**
     * @param {html element} hostElement is the html element where the
     *     visualization canvas will be appended.
     * @param {boolean} saveBuffer boolean is used to indicate if the screenbuffer
     *     should be stored for creating screenshots. When not creating
     *     screenshots keep it off.
     * @param {options} An object that can hold custom settings for the viewer.
     */
    constructor(public hostElement, options={}, public saveBuffer=false) {
        this.handleSettings(options);
        this.setupRootElement();
        this.setupRenderer();
        this.setupScenes();
        this.setupStatic();
        this.setupCamera();
        this.setupControls()
        this.setupHostElement(hostElement);
        if (this.options.autoResize) {
            window.addEventListener('resize', this.onWindowResize.bind(this), false);
        }
    }

    handleSettings(opt:Object) {
        // Controls settings
        this.options["enableZoom"]   = opt["enableZoom"] === undefined   ? true : opt["enableZoom"];
        this.options["enableRotate"] = opt["enableRotate"] === undefined ? true : opt["enableRotate"];
        this.options["enablePan"]    = opt["enablePan"] === undefined    ? true : opt["enablePan"];
        this.options["panSpeed"]     = opt["panSpeed"] === undefined     ? 10   : opt["panSpeed"];
        this.options["zoomSpeed"]    = opt["zoomSpeed"] === undefined    ? 2.5  : opt["zoomSpeed"];
        this.options["rotateSpeed"]  = opt["rotateSpeed"] === undefined  ? 2.5  : opt["rotateSpeed"];
        this.options["autoFit"]      = opt["autoFit"] === undefined      ? true  : opt["autoFit"];
        this.options["autoResize"]   = opt["autoResize"] === undefined   ? true  : opt["autoResize"];
    }

    /**
     * This function will clear the old view and visualize the new Brilloun
     * zone based on the given data.
     *
     * @param {object} data object holding the visualized data.
     */
    load(data) {
        // Clear all the old data
        this.clear();

        // Reconstruct the visualization
        this.setupScenes();
        this.setupLights();
        this.setupCamera();
        this.setupControls();

        let valid:boolean = this.setupVisualization(data);
        if (this.options["autoFit"]) {
            this.fitToCanvas();
        }
        this.render();
        this.animate();
        return valid;
    }

    /**
     * Loads visuzalization data from a JSON url.
     *
     * @param {string} url Path to the json resource.
     */
    loadJSON(url) {

        // Open file
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = () => {
            this.load(JSON.parse(xhr.responseText))
        };
        xhr.open("GET", url, true);
        xhr.send();
    }

    /*
     * This function should use the given data to setup the visualization.
     *
     * Should return a boolean value indicating if the visualization was
     * successful.
     */
    abstract setupVisualization(data): boolean;

    /**
     * This function can be used to setup any static assets in the
     * constructore, like dat.gui settings window.
     */
    setupStatic() {
    }

    /*
     * Used to setup the lighting.
     */
    abstract setupLights(): void;


    /*
     * Used to setup the scenes. This default implementation will create a
     * single scene. Override this function to create additional scenes and
     * push them all to the 'scenes' attribute.
     */
    setupScenes() {
        this.scenes = [];
        this.scene = new THREE.Scene();
        this.scenes.push(this.scene);
    }

    /*
     * Clears the entire visualization.
     */
    clear() {
        this.clearScenes();
        this.scenes = null;
        this.controls = null;
        this.camera = null;
        this.cornerPoints = null;
    }
    /*
     * This function will clear everything inside the scenes. This should
     * ensure that memory is not leaked. Cameras, controls and lights are not
     * part of the scene, so they are reset elsewhere.
     */
    clearScenes() {
        for (let iScene=0; iScene<this.scenes.length; ++iScene) {
            let scene = this.scenes[iScene];
            scene.traverse( function(node) {

                let geometry = node.geometry;
                let material = node.material;
                let texture = node.texture;
                if (geometry) {
                    geometry.dispose();
                }
                if (material) {
                    material.dispose();
                }
                if (texture) {
                    texture.dispose();
                }
            })
            while (scene.children.length)
            {
                let child = scene.children[0];
                scene.remove(child);
            }
        }
    }

    /**
     * Can be used to download the current visualization as a jpg-image to the
     * browser's download location.
     */
    takeScreenShot(filename) {
        let imgData, imgNode;
        try {
            let strMime = "image/jpeg";
            let strDownloadMime = "image/octet-stream";
            imgData = this.renderer.domElement.toDataURL(strMime);

            let strData = imgData.replace(strMime, strDownloadMime);
            filename = filename + ".jpg";
            let link = document.createElement('a');
            if (typeof link.download === 'string') {
                document.body.appendChild(link); //Firefox requires the link to be in the body
                link.download = filename;
                link.href = strData;
                link.click();
                document.body.removeChild(link); //remove the link when done
            } else {
                location.replace(uri);
            }

        } catch (e) {
            console.log(e);
            return;
        }
    }

    /**
     * This will check if WegGL is available on the current browser.
     */
    webglAvailable() {
		try {
			let canvas = document.createElement( 'canvas' );
			return !!( window.WebGLRenderingContext && (
				canvas.getContext( 'webgl' ) ||
				canvas.getContext( 'experimental-webgl' ) )
			);
		} catch ( e ) {
			return false;
		}
	}

    /**
     * This will setup the three.js renderer object. Uses WebGL by default, can
     * use a canvas fallback is WegGL is not available.
     */
    setupRenderer() {
        // Create the renderer. The "alpha: true" enables to set a background color.
        if ( this.webglAvailable()  ) {
            this.renderer = new THREE.WebGLRenderer({
                alpha: true,
                antialias: true,
                preserveDrawingBuffer: this.saveBuffer
            });
        } else {
            console.log("WebGL is not supported on this browser, cannot display structure.");
        }
        this.renderer.shadowMapEnabled = false;
        this.renderer.shadowMapType = THREE.PCFSoftShadowMap;
        this.renderer.setSize(this.rootElement.clientWidth, this.rootElement.clientHeight);
        this.renderer.setClearColor( 0xffffff, 0);  // The clear color is set to fully transparent to support custom backgrounds
        this.rootElement.appendChild(this.renderer.domElement);

        // This is set so that multiple scenes can be used, see
        // http://stackoverflow.com/questions/12666570/how-to-change-the-zorder-of-object-with-threejs/12666937#12666937
        this.renderer.autoClear = false;
    }

    /*
     * Used to setup and position the camera.
     */
    setupCamera() {
        let aspectRatio = this.rootElement.clientWidth/this.rootElement.clientHeight;
        let width = this.cameraWidth;
        let height = width/aspectRatio;
        this.camera = new THREE.OrthographicCamera(width/-2, width/2, height/2, height/-2, -100, 1000 );
        this.camera.name = "camera";
        this.camera.position.z = 20;
    }

    /**
     * Used to setup a root DIV element that will contain the whole
     * visualization, and which will be placed inside the given target element.
     *
     * The root element should always fill the whole host element, and we try
     * to ensure this by setting width and height to 100%. The position is set
     * to relative, so that the child divs can be set relative to this root div
     * with absolute positioning.
     */
    setupRootElement() {
        this.rootElement = document.createElement("div");
        this.rootElement.style.width = "100%"
        this.rootElement.style.height = "100%"
        this.rootElement.style.position = "relative"
    }

    /**
     * Used to setup the DOM element where the viewer will be displayed.
     */
    setupHostElement(hostElement:any) {

        // If a previous target element is set, remove it
        if (this.hostElement) {
            while (this.hostElement.firstChild) {
                this.hostElement.removeChild(this.hostElement.firstChild);
            }
        }

        // Setup the new targetElment
        hostElement.appendChild(this.rootElement);
        this.resizeCanvasToHostElement();
    }

    /**
     * Used to setup the DOM element where the viewer will be displayed.
     */
    changeHostElement(hostElement:any) {
        this.setupHostElement(hostElement);
        if (this.options["autoFit"]) {
            this.fitToCanvas();
        }
        this.render();
    }

    /*
     * Used to setup the controls that allow interacting with the visualization
     * with mouse.
     */
    setupControls(
    ) {
        let controls = new THREE.OrthographicControls(this.camera, this.rootElement);
        controls.rotateSpeed = this.options.rotateSpeed;
        controls.rotationCenter = new THREE.Vector3();
        controls.zoomSpeed = this.options.zoomSpeed;
        controls.panSpeed = this.options.panSpeed;

        controls.enableZoom = this.options["enableZoom"];
        controls.enablePan = this.options["enablePan"];
        controls.enableRotate = this.options["enableRotate"];

        controls.staticMoving = true;
        controls.dynamicDampingFactor = 0.25;
        controls.keys = [ 65, 83, 68 ];
        controls.addEventListener( 'change', this.render.bind(this) );
        this.controls = controls;
    }

    /**
     * This will automatically fit the structure to the given rendering area.
     * Will also leave a small margin.
     */
    fitToCanvas() {
        // Make sure that all transforms are updated
        this.scenes.forEach((scene) => scene.updateMatrixWorld());

        // Project all 8 corners of the normalized cell into screen space and
        // see how the system should be scaled to fit it to screen
        let canvas = this.rootElement;
        let canvasWidth = canvas.clientWidth;
        let canvasHeight = canvas.clientHeight;
        let cornerPos = [];

        // Figure out the center in order to add margins in right direction
        let centerPos = new THREE.Vector3();
        for (let len=this.cornerPoints.geometry.vertices.length, i=0; i<len; ++i) {
            let screenPos = this.cornerPoints.geometry.vertices[i].clone();
            this.cornerPoints.localToWorld(screenPos);
            centerPos.add(screenPos);
        }
        centerPos.divideScalar(this.cornerPoints.geometry.vertices.length);

        for (let len=this.cornerPoints.geometry.vertices.length, i=0; i<len; ++i) {
            let screenPos = this.cornerPoints.geometry.vertices[i].clone();
            this.cornerPoints.localToWorld(screenPos);

            // Default the zoom to 1 for the projection
            let oldZoom = this.camera.zoom;
            this.camera.zoom = this.options.zoomLevel;
            this.camera.updateProjectionMatrix();

            // Figure out the direction from center
            let diff = centerPos.sub(screenPos);
            diff.project( this.camera );
            let right = diff.x < 0 ? true : false;
            let up = diff.y < 0 ? true : false;

            // Map to corner coordinates to
            screenPos.project( this.camera );

            // Add a margin
            let margin = this.fitMargin;
            let cameraUp = new THREE.Vector3( 0, margin, 0 );
            let cameraRight = new THREE.Vector3( margin, 0, 0 );
            cameraUp.applyQuaternion( this.camera.quaternion );
            cameraRight.applyQuaternion( this.camera.quaternion );

            if (up) {
                screenPos.add(cameraUp);
            } else {
                screenPos.sub(cameraUp);
            }
            if (right) {
                screenPos.add(cameraRight);
            } else {
                screenPos.sub(cameraRight);
            }

            // Map to 2D screen space
            screenPos.x = Math.round( (   screenPos.x + 1 ) * canvasWidth  / 2 );
            screenPos.y = Math.round( ( - screenPos.y + 1 ) * canvasHeight / 2 );
            screenPos.z = 0;

            cornerPos.push(screenPos);
        }

        // Find the minimum and maximum in both screen dimensions
        let minX = cornerPos[0].x;
        let maxX = cornerPos[0].x;
        let minY = cornerPos[0].y;
        let maxY = cornerPos[0].y;
        for (let len=cornerPos.length, i=0; i<len; ++i) {
            let pos = cornerPos[i];
            let x =  pos.x;
            let y =  pos.y;
            if (x > maxX) {
                maxX = x;
            } else if (x < minX) {
                minX = x;
            }
            if (y > maxY) {
                maxY = y;
            } else if (y < minY) {
                minY = y;
            }
        }
        // Calculate width margin by scaling the
        let width = maxX - minX;
        let height = maxY - minY;
        let xFactor = canvasWidth/width;
        let yFactor = canvasHeight/height;

        // Decide which dimension is the more restricting one
        let factor;
        if (xFactor <= 1 && yFactor <= 1) {
            factor = Math.min(xFactor, yFactor);
        } else if (xFactor >= 1 && yFactor >= 1) {
            factor = Math.min(xFactor, yFactor);
        } else if (xFactor <= 1 && yFactor >= 1) {
            factor = xFactor;
        } else if (yFactor <= 1 && xFactor >= 1) {
            factor = yFactor;
        }

        this.camera.zoom = factor;
        this.camera.updateProjectionMatrix();
    }

    /*
     * Get the current zoom level for the visualization.
     */
    getZoom() {
        return this.camera.zoom;
    }

    /**
     * Sets the zoom level for the visualization.
     *
     * @param zoom - The wanted zoom level as a floating point number.
     */
    setZoom(zoom) {
        this.camera.zoom = zoom;
        this.camera.updateProjectionMatrix();
    }

    /*
     * Callback function that is invoked when the window is resized.
     */
    resizeCanvasToHostElement() {
        let aspectRatio = this.rootElement.clientWidth/this.rootElement.clientHeight;
        let width = this.cameraWidth;
        let height = width/aspectRatio;
        this.camera.left = -width/2
        this.camera.right = width/2
        this.camera.top = height/2
        this.camera.bottom = -height/2
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.rootElement.clientWidth, this.rootElement.clientHeight);
        this.controls.handleResize();
        this.render();
    }

    onWindowResize() {
        this.resizeCanvasToHostElement();
        if (this.options["autoFit"]) {
            this.fitToCanvas();
        }
        this.render();
    }

    /*
     * Used to render all the scenes that are present. The scenes will be
     * rendered on top of each other, so make sure that they are in the right
     * order.
     *
     * This approach is copied from
     * http://stackoverflow.com/questions/12666570/how-to-change-the-zorder-of-object-with-threejs/12666937#12666937
     */
    render() {
        this.renderer.clear();
        for (let iScene=0; iScene<this.scenes.length; ++iScene) {
            let scene = this.scenes[iScene];
            this.renderer.render(scene, this.camera);
            if (iScene !== this.scenes.length -1) {
                this.renderer.clearDepth();
            }
        }
    }

    /*
     * This function sets up the scene updating when mouse is moved. This way
     * we only ask the graphics to be updated when user manipulates the scene,
     * and not in a constantly running loop. The idea comes from
     *
     * https://threejs.org/examples/?q=track#misc_controls_trackball
     */
    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.controls.update();
    }

    /**
     * Helper function for creating a cylinder mesh.
     *
     * @param pos1 - Start position
     * @param pos2 - End position
     * @param radius - Cylinder radius
     * @param material - Cylinder material
     */
    createCylinder(pos1, pos2, radius, nSegments, material) {
        var direction = new THREE.Vector3().subVectors( pos2, pos1 );
        let dirLen = direction.length();
        let dirNorm = direction.clone().divideScalar(dirLen);
        var arrow = new THREE.ArrowHelper( dirNorm, pos1 );
        var edgeGeometry = new THREE.CylinderGeometry( radius, radius, dirLen, nSegments, 0 );
        var edge = new THREE.Mesh( edgeGeometry, material);

        edge.rotation.copy(arrow.rotation.clone());
        edge.position.copy(new THREE.Vector3().addVectors( pos1, direction.multiplyScalar(0.5) ));

        return edge;
    }

    /**
     * Rotate an object around an arbitrary axis in world space
     * @param obj - The THREE.Object3D to rotate
     * @param axis - The axis in world space
     * @param radians - The angle in radians
     */
    rotateAroundWorldAxis(obj, axis, radians) {
        let rotWorldMatrix = new THREE.Matrix4();
        rotWorldMatrix.makeRotationAxis(axis.normalize(), radians);
        rotWorldMatrix.multiply(obj.matrix);        // pre-multiply
        obj.matrix = rotWorldMatrix;
        obj.rotation.setFromRotationMatrix(obj.matrix);
    }
}
