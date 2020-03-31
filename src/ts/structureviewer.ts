import { Viewer } from "./viewer"
declare let THREE;

/**
 * Class for visualizing a 3D crystal structure. Uses three.js to do the
 * visualization with WegGL or alternatively in html5 canvas.
 */
export class StructureViewer extends Viewer {
    root:any;                             // three.js root object in the scene
    atoms:any;                            // three.js object for storing the atoms
    convCell:any;                         // three.js object for storing the cell
    primCell:any;                         // three.js object for storing the primitive cell
    bonds:any;                            // Contains the atomic bonds
    atomPos:any[];                        // Contains the positions of the visualized atoms
    atomNumbers:any[];                    // Contains the atomic numbers of the visualized atoms
    latticeParameters:any;                // Contains visuals for lattice parameters
    basisVectors:any[];                   // List of basis vectors for the cell
    primitiveVectors:any[];               // List of basis vectors for the primitive cell
    elements:Object;
    sceneStructure:any;
    sceneInfo:any;
    settings:Object;
    settingsHandler:any
    datGui:any
    elementLegend:any;
    conerPoints:any;                      // Cornerpoints for the final visualized system
    fitMargin:number = 0.5;                 // The scene containing the information that is overlayed on top of the BZ
    //radiusFactor:number = 1;            // The factor that is used to scale the covalent radii of the atoms

    lights:any[];                         // Contains the lights in the scene
    bondFills:any[];                      // Contains the bulk of the bonds
    atomFills:any[];                      // Contains the bulk of the atoms
    atomOutlines:any[];                   // Contains the outlines of the atoms
    cellVectorLines:any;
    angleArcs:any;
    axisLabels:any[] = [];                // List of all labels in the view.
    wrapTolerance:number = 0.05;          // Tolerance of the wrapping in Angstroms
    tags:any;                             // Additional tags for identifying certain kinds of atoms
    tagColorMap = {
        "adsorbates": "0xd70000",
        "unknowns": "0xd75f00",
        "interstitials": "0xaf8700",
        "substitutions": "0x0087ff",
        "outliers": "0x0087ff"
    };
    vacancyContainer:any;                 // Contains the vacancy meshes

    /*
     * Overrides the implementation from the base class, as we need two scenes:
     * one for the structure and another for the information that is laid on top.
     */
    setupScenes() {
        this.scenes = [];
        this.sceneStructure = new THREE.Scene();
        this.scenes.push(this.sceneStructure);
        this.sceneInfo = new THREE.Scene();
        this.scenes.push(this.sceneInfo);
    }

    /**
     * Used to setup the visualization according to the given options.
     */
    handleSettings(opt:Object) {

        // Controls settings
        this.options["showParam"]     = opt["showParam"] === undefined     ? true  : opt["showParam"];
        this.options["showLegend"]    = opt["showLegend"] === undefined    ? true  : opt["showLegend"];
        this.options["showBonds"]     = opt["showBonds"] === undefined     ? true  : opt["showBonds"];
        this.options["showShadows"]   = opt["showShadows"] === undefined   ? false : opt["showShadows"];
        this.options["showTags"]      = opt["showTags"] === undefined      ? false : opt["showTags"];
        this.options["showVacancies"] = opt["showVacancies"] === undefined ? false : opt["showVacancies"];
        this.options["showOptions"]   = opt["showOptions"] === undefined   ? true  : opt["showOptions"];
        this.options["allowRepeat"]   = opt["allowRepeat"] === undefined   ? true  : opt["allowRepeat"];
        this.options["showCopies"]    = opt["showCopies"] === undefined    ? false : opt["showCopies"];
        this.options["showCell"]      = opt["showCell"] === undefined      ? true  : opt["showCell"];
        this.options["wrap"]          = opt["wrap"] === undefined          ? true  : opt["wrap"];
        this.options["radiusScale"]   = opt["radiusScale"] === undefined   ? 1     : opt["radiusScale"];
        this.options["bondScale"]     = opt["bondScale"] === undefined     ? 1     : opt["bondScale"];
        this.options["translation"]   = opt["translation"] === undefined   ? [0, 0, 0] : opt["translation"];
        this.options["zoomLevel"]     = opt["zoomLevel"] === undefined     ? 1     : opt["zoomLevel"];
        this.options["viewCenter"]    = opt["viewCenter"] === undefined    ? "COP" : opt["viewCenter"];

        // Handle base class settings
        super.handleSettings(opt);
    }

    /**
     * Setup the structure visualization based on the given data.
     *
     * @param {Object} data -  The structure data. Contains the following
     * attributes:
     *
     *     - cell
     *     - scaledPositions
     *     - atomicNumbers
     *     - primitiveCell (optional)
     *     - pbc (optional)
     *     - unit (optional): An unit cell from which a larger piece is
     *          composed of
     *     - tags (optional): The indices for certain special atoms in the system.
     */
    setupVisualization(data): boolean {

        // Check that the received data is OK.
        let primitiveCell = data["primitiveCell"];
        let cell = data["cell"];
        let scaledPositions = data["scaledPositions"];
        let positions = data["positions"];
        let atomicNumbers = data["atomicNumbers"];
        let chemicalSymbols = data["chemicalSymbols"];
        let periodicity = data["pbc"];
        let bonds = data["bonds"];
        this.tags = data["tags"];

        if (!scaledPositions && !positions) {
            console.log("No atom positions given to the structure viewer")
            return false;
        }
        if (!atomicNumbers && !chemicalSymbols) {
            console.log("No atomicNumbers or chemicalSymbols given to the structure viewer.")
            return false;
        }

        // Determine the atomicNumbers if not given
        if (!atomicNumbers) {
            atomicNumbers = chemicalSymbols.map(symb => {
                return this.elementNumbers[symb];
            });
        };

        // If bonds are not explicitly stated, determine them automatically.
        if (!bonds) {
            bonds == "auto";
        } else {
            if (bonds != "off" && bonds != "auto" && !Array.isArray(bonds)) {
                console.log("Invalid value for 'bonds'. Use either 'auto', 'off' or provide a list of index pairs. If not defined, 'auto' is assumed.")
                return false;
            }
        }

        if (positions) {
            if (positions.length != atomicNumbers.length) {
                console.log("The number of positions does not match the number of labels.")
                return false;
            }
        }
        if (scaledPositions) {
            if (scaledPositions.length != atomicNumbers.length) {
                console.log("The number of scaled positions does not match the number of labels.")
                return false;
            }
        }

        // Assume 3D periodicity if not defined
        if ((periodicity == undefined) || (periodicity == null)) {
            periodicity = [true, true, true];
        }

        this.root = new THREE.Object3D();
        this.atoms = new THREE.Object3D();
        this.bonds = new THREE.Object3D();
        this.cellVectorLines = new THREE.Object3D();
        this.angleArcs = new THREE.Object3D();
        this.root.add(this.cellVectorLines);
        this.root.add(this.atoms);
        this.root.add(this.bonds);
        this.sceneStructure.add(this.root);
        this.basisVectors = this.createBasisVectors(cell);
        let relPos = [];
        let cartPos = [];

        // Create a set of relative and cartesian positions
        if (scaledPositions !== undefined) {
            for (let i=0; i < scaledPositions.length; ++i) {
                let pos = scaledPositions[i];
                let iRelPos = new THREE.Vector3().fromArray(pos);

                // Wrap the positions
                let x = iRelPos.x;
                let y = iRelPos.y;
                let z = iRelPos.z;
                if (this.options.wrap) {
                    if (periodicity[0] && this.almostEqual(1, x, this.basisVectors[0], this.wrapTolerance)) {
                        x -= 1;
                    }
                    if (periodicity[1] && this.almostEqual(1, y, this.basisVectors[1], this.wrapTolerance)) {
                        y -= 1;
                    }
                    if (periodicity[2] && this.almostEqual(1, z, this.basisVectors[2], this.wrapTolerance)) {
                        z -= 1;
                    }
                }
                iRelPos = new THREE.Vector3(x, y, z);
                relPos.push(iRelPos);

                let iCartPos = new THREE.Vector3();
                iCartPos.add(this.basisVectors[0].clone().multiplyScalar(iRelPos.x));
                iCartPos.add(this.basisVectors[1].clone().multiplyScalar(iRelPos.y));
                iCartPos.add(this.basisVectors[2].clone().multiplyScalar(iRelPos.z));
                cartPos.push(iCartPos);
            }
        } else if (positions !== undefined) {
            for (let i=0; i < positions.length; ++i) {
                let pos = positions[i];
                let iCartPos = new THREE.Vector3().fromArray(pos);
                cartPos.push(iCartPos);

                // Calculate the relative positions
                let cellMatrix = new THREE.Matrix3();
                cellMatrix.set(
                    cell[0][0], cell[0][1], cell[0][2],
                    cell[1][0], cell[1][1], cell[1][2],
                    cell[2][0], cell[2][1], cell[2][2],
                )
                let cellInverse = new THREE.Matrix3().getInverse(cellMatrix);
                let iRelPos = iCartPos.clone().applyMatrix3(cellInverse);
                relPos.push(iRelPos);
            }
        }

        // Determine the corner points that are used to properly fit the structure into the viewer.
        this.createVizualizationBoundaryPositions(cartPos, atomicNumbers);

        // Determine the periodicity and setup the vizualization accordingly
        let nPeriodic = 0;
        let periodicIndices = [];
        let p1 = periodicity[0];
        let p2 = periodicity[1];
        let p3 = periodicity[2];

        if (p1 && p2 && p3) {
            nPeriodic = 3;
        } else if (!p1 && !p2 && !p3) {
            nPeriodic = 0;
        } else {
            for (let dim = 0; dim < 3; ++dim) {
                let p1 = periodicity[dim];
                let p2 = periodicity[(dim+1) % 3];
                let p3 = periodicity[(dim+2) % 3];
                if (p1 && !p2 && !p3) {
                    nPeriodic = 1;
                    periodicIndices.push(dim)
                    break;
                }
                else if (p1 && p2 && !p3) {
                    nPeriodic = 2;
                    periodicIndices.push(dim);
                    periodicIndices.push((dim+1) % 3);
                    break;
                }
            }
        }
        if (nPeriodic === 0) {
            this.setup0D(relPos, cartPos, atomicNumbers);
        }
        if (nPeriodic === 1) {
            this.setup1D(relPos, cartPos, atomicNumbers, periodicity, periodicIndices);
        }
        else if (nPeriodic === 2) {
            this.setup2D(relPos, cartPos, atomicNumbers, periodicity, periodicIndices);
        }
        else if (nPeriodic === 3) {
            this.setup3D(relPos, cartPos, atomicNumbers);
        }

        // Create bonds
        this.createBonds(bonds);

        // Setup the view center
        let viewCenter = this.options["viewCenter"];
        let centerPos;
        if (viewCenter === "COP") {
            centerPos = this.calculateCOP(cartPos);
        } else if (viewCenter === "COC") {
            centerPos = new THREE.Vector3()
                .add(this.basisVectors[0])
                .add(this.basisVectors[1])
                .add(this.basisVectors[2])
            .multiplyScalar(0.5);
        } else if (Array.isArray(viewCenter)) {
            centerPos = new THREE.Vector3().fromArray(viewCenter);
        }
        this.setViewCenter(centerPos);

        // Translate the system according to given option
        this.translate(this.options.translation);

        // Zoom according to given option
        this.setZoom(this.options.zoomLevel);

        // Create the vacancy atoms if given
        this.createVacancies()

        // Setup element legend and settings
        this.createElementLegend();
        this.optionsHandler();

        return true;
    }

    /**
     *
     */
    calculateCOP(positions) {
        let nPos = positions.length;
        let sum = new THREE.Vector3();
        for (let i=0; i < nPos; ++i) {
            let pos = positions[i];
            sum.add(pos);
        }
        sum.divideScalar(nPos);
        return sum;
    }

    /**
     * Centers the visualization around a specific point.
     * @param centerPos - The center position as a cartesian vector.
     */
    setViewCenter(centerPos:THREE.Vector3) {
        this.cornerPoints.position.sub(centerPos);
        this.atoms.position.sub(centerPos);
        this.bonds.position.sub(centerPos);
        this.latticeParameters.position.sub(centerPos);
        this.angleArcs.position.sub(centerPos);
        this.convCell.position.sub(centerPos);
        this.render();
    }

    /**
     * Translate the atoms.
     *
     * @param translation - Cartesian translation to apply.
     */
    translate(translation:number[]) {
        let vec = new THREE.Vector3().fromArray(translation);
        this.atoms.position.add(vec);
        this.bonds.position.add(vec);
        this.render();
    }

    /**
     * Set the zoom level
     *
     * @param zoomLevel - The zoom level as a scalar.
     */
    setZoom(zoomLevel:number[]) {
        this.camera.zoom = zoomLevel;
        this.render();
    }

    /**
     *
     */
    createVacancies() {
        if (this.tags) {
            let vacancies = this.tags.vacancies;
            if (vacancies) {
                let relPos = [];
                let labels = [];
                for (let i=0; i < vacancies.length; ++i) {
                    let vacancy = vacancies[i];
                    relPos.push(new THREE.Vector3().fromArray(vacancy.position));
                    labels.push(vacancy.label);
                }
                let meshMap = {};
                this.vacancyContainer = new THREE.Object3D();
                this.vacancyContainer.visible = false;
                for (let len=relPos.length, i=0; i<len; ++i) {
                    let iRelPos = relPos[i];

                    // Add the primary atom
                    let atomicNumber = labels[i];
                    let atomData = this.createAtom(iRelPos, atomicNumber, meshMap);
                    let atom = atomData[0];
                    atom.material.opacity = 0.25;
                    atom.material.transparent = true;
                    let outline = atomData[1];
                    outline.material.opacity = 0.25;
                    outline.material.transparent = true;
                    this.vacancyContainer.add(atom);
                    this.vacancyContainer.add(outline);
                }
                this.atoms.add(this.vacancyContainer);
            }
        }
    }

    /**
     * This function will setup the dat.gui based settings window amd the
     * element legend div.
     */
    setupStatic() {

        // Setup dat.gui settings window
        this.optionsHandler = function( ) {
            let showParam = this.options.showParam;
            let showCell = this.options.showCell;
            let showLegend = this.options.showLegend;
            let showBonds = this.options.showBonds;
            let showShadows = this.options.showShadows;
            let showTags = this.options.showTags;
            let showVacancies = this.options.showVacancies;
            let showOptions = this.options.showOptions;
            this.toggleLatticeParameters(showParam);
            this.toggleCell(showCell);
            this.toggleElementLegend(showLegend);
            this.toggleBonds(showBonds);
            this.toggleShadows(showShadows);
            this.toggleTags(showTags);
            this.toggleVacancies(showVacancies);
            this.toggleOptions(showOptions);
        }.bind(this);
        this.datGui = new dat.GUI({autoPlace: false, width: 150});
        this.datGui.domElement.id = "datgui"
        this.datGui.domElement.style.display = "None";
        this.datGui.close();
        this.rootElement.appendChild(this.datGui.domElement)
        this.datGui.add( this.options, "showParam", true ).name("Lattice parameters").onChange( this.optionsHandler );
        this.datGui.add( this.options, "showCell", true ).name("Cell").onChange( this.optionsHandler );
        this.datGui.add( this.options, "showLegend", true ).name("Element labels").onChange( this.optionsHandler );
        this.datGui.add( this.options, "showBonds", true ).name("Bonds").onChange( this.optionsHandler );
        this.datGui.add( this.options, "showShadows", false ).name("Shadows").onChange( this.optionsHandler );
        this.datGui.add( this.options, "showTags", false ).name("Tags").onChange( this.optionsHandler );
        this.datGui.add( this.options, "showVacancies", false ).name("Vacancies").onChange( this.optionsHandler );
        this.datGui.add( this.options, "showOptions", false ).name("Options").onChange( this.optionsHandler );

        // Setup div containing the element labels
        var legendDiv = document.createElement('div');
        legendDiv.id = 'elementlegend';
        this.elementLegend = legendDiv;
        this.rootElement.appendChild(legendDiv);
    }

    setupLights() {

        this.lights = [];
        let shadowMapWidth = 2048;

        // Key light
        let keyLight = new THREE.DirectionalLight(0xffffff, 0.45);
        keyLight.shadowMapWidth = shadowMapWidth;
        keyLight.shadowMapHeight = shadowMapWidth;
        keyLight.position.set(0, 0, 20)
        this.sceneStructure.add( keyLight );
        this.lights.push(keyLight);

        // Fill light
        let fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.shadowMapWidth = shadowMapWidth;
        fillLight.shadowMapHeight = shadowMapWidth;
        fillLight.position.set(-20, 0, -20)
        this.sceneStructure.add( fillLight );
        this.lights.push(fillLight);

        // Back light
        let backLight = new THREE.DirectionalLight(0xffffff, 0.25);
        backLight.shadowMapWidth = shadowMapWidth;
        backLight.shadowMapHeight = shadowMapWidth;
        backLight.position.set( 20, 0, -20 );
        //backLight.position.set( 0, 0, -20 );
        this.sceneStructure.add( backLight );
        this.lights.push(backLight);

        // White ambient light.
        let ambientLight = new THREE.AmbientLight( 0x404040, 1.7 ); // soft white light
        this.sceneStructure.add( ambientLight );
    }

    /**
     *
     */
    toggleElementLegend(value:boolean) {
        if (value) {
            this.elementLegend.style.display = "flex";
        } else {
            this.elementLegend.style.display = "None";
        }
    }

    /**
     * Used to toggle the datGui options panel on or off
     */
    toggleOptions(value:boolean) {
        if (value) {
            this.datGui.domElement.style.display = "block";
        } else {
            this.datGui.domElement.style.display = "None";
        }
    }
    /**
     * Used to toggle the datGui options panel on or off
     */
    toggleVacancies(value:boolean) {
        if (this.vacancyContainer) {
            this.vacancyContainer.visible = value;
            this.render();
        }
    }

    /**
     * Used to toggle the datGui options panel on or off
     */
    toggleTags(value:boolean) {
        if (this.tags) {
            if (value) {
                var adsorbateColor = this.tagColorMap.adsorbates;
                var substitutionColor = this.tagColorMap.substitutions;
                var interstitialColor = this.tagColorMap.interstitials;
                var unknownColor = this.tagColorMap.unknowns;
                var outlierColor = this.tagColorMap.outliers;
                var scale = 1.15;
            } else {
                var black = 0x000000;
                var adsorbateColor = black;
                var substitutionColor = black;
                var outlierColor = black;
                var scale = 1;
            }
            // Outliers
            if (this.tags.additionals) {
                for (let i=0; i < this.tags.additionals.length; ++i) {
                    let index = this.tags.additionals[i];
                    let mesh = this.atomOutlines[index];
                    let mat = mesh.material.clone();
                    mesh.scale.set(scale, scale, scale);
                    mat.color.setHex(outlierColor);
                    mesh.material = mat;
                }
            }
            // Adsorbates
            if (this.tags.adsorbates) {
                for (let i=0; i < this.tags.adsorbates.length; ++i) {
                    let index = this.tags.adsorbates[i];
                    let mesh = this.atomOutlines[index];
                    let mat = mesh.material.clone();
                    mesh.scale.set(scale, scale, scale);
                    mat.color.setHex(adsorbateColor);
                    mesh.material = mat;
                }
            }
            // Substitutions
            if (this.tags.substitutions) {
                for (let i=0; i < this.tags.substitutions.length; ++i) {
                    let index = this.tags.substitutions[i];
                    let mesh = this.atomOutlines[index];
                    let mat = mesh.material.clone();
                    mesh.scale.set(scale, scale, scale);
                    mat.color.setHex(substitutionColor);
                    mesh.material = mat;
                }
            }
            // Interstitials
            if (this.tags.interstitials) {
                for (let i=0; i < this.tags.interstitials.length; ++i) {
                    let index = this.tags.interstitials[i];
                    let mesh = this.atomOutlines[index];
                    let mat = mesh.material.clone();
                    mesh.scale.set(scale, scale, scale);
                    mat.color.setHex(interstitialColor);
                    mesh.material = mat;
                }
            }
            // Unknowns
            if (this.tags.unknowns) {
                for (let i=0; i < this.tags.unknowns.length; ++i) {
                    let index = this.tags.unknowns[i];
                    let mesh = this.atomOutlines[index];
                    let mat = mesh.material.clone();
                    mesh.scale.set(scale, scale, scale);
                    mat.color.setHex(unknownColor);
                    mesh.material = mat;
                }
            }
            this.render();
        }
    }

    /**
     * Hides or shows the lattice parameter labels.
     */
    toggleLatticeParameters(value:boolean) {
        this.latticeParameters.visible = value;
        this.cellVectorLines.visible = value;
        this.angleArcs.visible = value;
        this.render();
    }

    /**
     * Hides or shows the cell.
     */
    toggleCell(value:boolean) {
        if (this.convCell !== undefined) {
            this.convCell.visible = value;
        }
        if (this.primCell !== undefined) {
            this.primCell.visible = value;
        }
        this.render();
    }

    /**
     * Hides or shows the bonds.
     */
    toggleBonds(value:boolean) {
        this.bonds.visible = value;
        this.render();
    }

    /**
     * Hides or shows the shadows.
     */
    toggleShadows(value:boolean) {

        this.renderer.shadowMapEnabled = value;
        for (let i=0; i < this.lights.length; ++i) {
            let light = this.lights[i];
            light.castShadow = value;
        }
        for (let i=0; i < this.atomFills.length; ++i) {
            let atom = this.atomFills[i];
            atom.receiveShadow = value;
            atom.castShadow = value;
            atom.material.needsUpdate = true;
        }
        for (let i=0; i < this.bondFills.length; ++i) {
            let bond = this.bondFills[i];
            bond.receiveShadow = value;
            bond.castShadow = value;
            bond.material.needsUpdate = true;
        }

        // For some reason double rendering is required... Maybe delay()?
        this.render();
        this.render();
    }

    /**
     *
     */
    createElementLegend() {
        // Empty the old legend
        while (this.elementLegend.firstChild) {
            this.elementLegend.removeChild(this.elementLegend.firstChild);
        }

        // Create a list of elements
        let elementArray = []
        for (let property in this.elements) {
            if (this.elements.hasOwnProperty(property)) {
                elementArray.push([property, this.elements[property][0], this.elements[property][1]]);
            }
        }

        // Sort by name
        elementArray.sort(function(a, b) {
            let keyA = a[0];
            let keyB = b[0];
            if(keyA < keyB) return -1;
            if(keyA > keyB) return 1;
            return 0;
        });

        for (let iElem=0; iElem<elementArray.length; ++iElem) {
            let elementName = elementArray[iElem][0];
            let elementColor = elementArray[iElem][1].toString(16);
            let nZeros = 6-elementColor.length;
            let prefix = "#" + Array(nZeros+1).join("0");
            elementColor = prefix + elementColor;
            let elementRadius = 50*elementArray[iElem][2];

            // Containing sphere
            let elemDiv = document.createElement('div');
            elemDiv.className = "elementlabel";
            elemDiv.style.backgroundColor = elementColor;
            elemDiv.style.height = elementRadius+"px";
            elemDiv.style.width = elementRadius+"px";
            elemDiv.style.textAlign = "center";
            elemDiv.style.verticalAlign = "middle";
            elemDiv.style.lineHeight = elementRadius+"px";
            elemDiv.style.borderRadius = elementRadius/2+"px";
            elemDiv.textContent = elementName;

            // Label inside
            this.elementLegend.appendChild(elemDiv);
        }
    }


    /**
     * Create the visuals to show the lattice parameter labels.
     */
    createLatticeParameters(basis, periodicity, periodicIndices) {
        this.latticeParameters = new THREE.Object3D();
        this.axisLabels = []
        this.sceneInfo.add(this.latticeParameters);
        this.sceneInfo.add(this.angleArcs);
        let nPeriod = 0;
        let infoColor = 0x000000;
        for (let iDim=0; iDim<periodicity.length; ++iDim) {
            if (periodicity[iDim]) {
                ++nPeriod;
            }
        }

        // Create the reciprocal space axes
        function createLabel(position:any, label:string, color, stroked:boolean=true) {
            // Configure canvas
            let canvas = document.createElement( 'canvas' );
            let size = 256;
            canvas.width = size;
            canvas.height = size;
            let ctx = canvas.getContext('2d');

            // Draw label
            ctx.fillStyle = color;
            //ctx.fillStyle = "#ffffff";
            ctx.font = "155px Arimo";
            ctx.textAlign = "center";
            if (stroked) {
                ctx.font = "160px Arimo";
                ctx.lineWidth = 8;
                ctx.strokeStyle="#000000";
                ctx.strokeText(label, size/2, size/2);
            }
            ctx.fillText(label, size/2, size/2);

            let texture = new THREE.Texture(canvas);
            texture.needsUpdate = true;
            let material = new THREE.SpriteMaterial( { map: texture } );
            let sprite = new THREE.Sprite( material );
            sprite.position.copy(position);
            let scale = 1.5;
            sprite.scale.set(scale, scale, 1);
            return sprite;
        }

        let axisMaterial = new THREE.LineBasicMaterial({
            color: "#000000",
            linewidth: 1.5
        });
        let axisOffset = 1.3;

        let cellBasisColors = ["#C52929", "#47A823", "#3B5796"];

        let iBasis = -1;
        let axisLabels = ["a", "b", "c"];
        let angleLabels = ["γ", "α", "β"];

        // If 2D periodic, we save the periodic indices, and ensure a right
        // handed coordinate system.
        let first;
        let second;
        if (nPeriod === 2) {
            first = periodicIndices[0];
            second = periodicIndices[1];
        }

        for (let iTrueBasis=0; iTrueBasis<3; ++iTrueBasis) {
            if (!periodicity[iTrueBasis]) {
                continue;
            }
            iBasis += 1;
            let axisLabel = axisLabels[iBasis];
            let axisColor = cellBasisColors[iBasis];

            // Basis and angle label selection, same for all systems
            let angleLabel = angleLabels[iBasis];

            let basisVec1 = basis[iTrueBasis];
            let basisVec2 = basis[(iTrueBasis+1) % 3].clone();
            let basisVec3 = basis[(iTrueBasis+2) % 3].clone();
            let origin = new THREE.Vector3( 0, 0, 0 );
            let dir = basisVec1.clone()

            // Add an axis label
            let textPos = dir.clone()
                .multiplyScalar(0.5);
            let labelOffset;
            let newBasis2;
            let newBasis3;
            if (basisVec2.length() == 0) {
                newBasis2 = new THREE.Vector3().crossVectors(basisVec1, basisVec3);
                labelOffset = new THREE.Vector3().crossVectors(basisVec1, newBasis2);
            } else if (basisVec3.length() == 0) {
                newBasis3 = new THREE.Vector3().crossVectors(basisVec1, basisVec2);
                labelOffset = new THREE.Vector3().crossVectors(basisVec1, basisVec3);
            } else {
                let labelOffset1 = new THREE.Vector3().crossVectors(basisVec1, basisVec2)
                let labelOffset2 = new THREE.Vector3().crossVectors(basisVec1, basisVec3)
                labelOffset = new THREE.Vector3().sub(labelOffset1).add(labelOffset2)
            }
            labelOffset.normalize()
            labelOffset.multiplyScalar(0.8)
            textPos.add(labelOffset);

            if (nPeriod === 3)  {
                axisLabel = createLabel(textPos, axisLabel, axisColor);
                this.latticeParameters.add(axisLabel)
                this.axisLabels.push(axisLabel);
            } else if (nPeriod === 2) {
                let axisLabelObj = createLabel(textPos, axisLabel, axisColor);
                this.latticeParameters.add(axisLabelObj)
                this.axisLabels.push(axisLabelObj);
                angleLabel = "γ";
            } else {
                let axisText = "a";
                let axisLabelObj = createLabel(textPos, axisText, axisColor);
                this.latticeParameters.add(axisLabelObj)
                this.axisLabels.push(axisLabelObj);
            }

            // Add basis vector colored line
            let cellVectorMaterial = new THREE.MeshBasicMaterial({
                color: axisColor,
                transparent: true,
                opacity: 0.75
            })
            let cellVector = basisVec1.clone();
            let cellVectorLine = this.createCylinder(origin.clone(), cellVector.clone().add(origin), 0.09, 10, cellVectorMaterial)
            this.latticeParameters.add(cellVectorLine);

            // Add basis vector axis line
            let cellAxisMaterial = new THREE.MeshBasicMaterial({
                color: "#000000",
            })
            let axisStart = this.basisVectors[iTrueBasis].clone();
            let axisEnd = axisStart.clone().multiplyScalar(1+axisOffset/axisStart.length());
            let cellAxisVector = basisVec1.clone();
            let cellAxisVectorLine = this.createCylinder(origin.clone(), axisEnd, 0.02, 10, cellAxisMaterial)
            this.latticeParameters.add(cellAxisVectorLine);

            // Add axis arrow
            let arrowGeometry = new THREE.CylinderGeometry( 0, 0.10, 0.5, 12 );
            let arrowMaterial = new THREE.MeshBasicMaterial({
                color: infoColor,
            });
            let arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
            arrow.position.copy(dir)
                .multiplyScalar(1+axisOffset/dir.length());
            arrow.lookAt(new THREE.Vector3());
            arrow.rotateX(-Math.PI/2);
            this.latticeParameters.add(arrow);

            // Add angle label and curve
            if (nPeriod === 1) {
                continue;
            } else if (nPeriod === 2) {
                if (!(iTrueBasis == first && (iTrueBasis+1)%3 == second)) {
                    continue;
                }
            }
            let arcMaterial = new THREE.LineDashedMaterial({
                color: infoColor,
                linewidth: 2,
                dashSize: 0.2,
                gapSize: 0.1
            });

            let normal = new THREE.Vector3().crossVectors(basisVec1, basisVec2)
            let angle = basisVec1.angleTo(basisVec2);
            let radius = Math.max(Math.min(1/4*basisVec1.length(), 1/4*basisVec2.length()), 1)
            let curve = new THREE.EllipseCurve(
                0, 0,             // ax, aY
                radius, radius,         // xRadius, yRadius
                0, angle,         // aStartAngle, aEndAngle
                false             // aClockwise
            );
            let points = curve.getSpacedPoints( 20 );
            let arcGeometry = new THREE.Geometry().setFromPoints(points);
            let arc = new THREE.Line( arcGeometry, arcMaterial);
            arc.computeLineDistances();

            // First rotate the arc so that it's x-axis points towards the
            // first basis vector that defines the arc
            let yAxis = new THREE.Vector3(0, 1, 0);
            let xAxis = new THREE.Vector3(1, 0, 0);
            let zAxis = new THREE.Vector3(0, 0, 1);
            let quaternion = new THREE.Quaternion().setFromUnitVectors(
                xAxis,
                basisVec1.clone().normalize()
            );
            arc.quaternion.copy(quaternion);

            // Then rotate the arc along it's x axis so that the xy-plane
            // coincides with the plane defined by the the two basis vectors
            // that define the plane.
            let lastArcPointLocal = arcGeometry.vertices[arcGeometry.vertices.length-1];
            arc.updateMatrixWorld();  // The positions are not otherwise updated properly
            let lastArcPointWorld = arc.localToWorld(lastArcPointLocal.clone());

            // The angle direction is defined by the first basis vector
            let axis = basisVec1;
            let arcNormal = new THREE.Vector3()
                .crossVectors(axis, lastArcPointWorld);
            let planeAngle = normal.angleTo(arcNormal);
            let planeCross = new THREE.Vector3()
                .crossVectors(basisVec2, lastArcPointWorld);
            let directionValue = planeCross.dot(axis);
            if (directionValue > 0) {
                planeAngle = -planeAngle;
            }
            arc.rotateX(planeAngle);

            // Add label
            arc.updateMatrixWorld();  // The positions are not otherwise updated properly
            arc.updateMatrix();  // The positions are not otherwise updated properly
            let angleLabelPos = arc.localToWorld(arcGeometry.vertices[9].clone());
            let angleLabelLen = angleLabelPos.length();
            angleLabelPos.multiplyScalar(1+0.3/angleLabelLen);
            let angleLabelObj = createLabel(angleLabelPos, angleLabel.toString(), "#FFFFFF", true);
            this.latticeParameters.add(angleLabelObj);
            this.axisLabels.push(angleLabelObj);
            this.angleArcs.add(arc);
        }
    }


    /**
     * Creates a list of THREE.Vector3s from the given list of arrays.
     *
     * @param vectors - The positions from which to create vectors.
     */
    createBasisVectors(vectors:number[][]) {
        let result = [];
        for (let len=vectors.length, i=0; i<len; ++i) {
            let vector = vectors[i];
            let basis_vector = new THREE.Vector3().fromArray(vector);
            result.push(basis_vector);
        }
        return result;
    }

    createVizualizationBoundaryPositions(positions, atomicNumbers) {
        // Determine the maximum and minimum values in all cartesian components
        let maxX = -Infinity;
        let maxY = -Infinity;
        let maxZ = -Infinity;
        let minX = Infinity;
        let minY = Infinity;
        let minZ = Infinity;
        let maxRadii = 0;
        for (let len=positions.length, i=0; i<len; ++i) {
            let iPos = positions[i];
            let iX = iPos.x;
            if (iX > maxX) {
                maxX = iX;
            }
            if (iX < minX) {
                minX = iX;
            }
            let iY = iPos.y;
            if (iY > maxY) {
                maxY = iY;
            }
            if (iY < minY) {
                minY = iY;
            }
            let iZ = iPos.z;
            if (iZ > maxZ) {
                maxZ = iZ;
            }
            if (iZ < minZ) {
                minZ = iZ;
            }

            // Determine maximum radius that will be added to the visualization boundaries
            let iRadius = this.elementRadii[atomicNumbers[i]];
            if (iRadius > maxRadii) {
                maxRadii = iRadius;
            }
        }

        // Add max atomic radii to boundaries

        // Push the corners of the cuboid as cornerpoints
        let origin = new THREE.Vector3(minX-maxRadii, minY-maxRadii, minZ-maxRadii);
        let basisX = new THREE.Vector3(maxX-minX+2*maxRadii, 0, 0);
        let basisY = new THREE.Vector3(0, maxY-minY+2*maxRadii, 0);
        let basisZ = new THREE.Vector3(0, 0, maxZ-minZ+2*maxRadii);
        let basis = [basisX, basisY, basisZ];

        // Get cuboid
        let pointGeometry = this.createCornerPoints(origin, basis);
        let points = new THREE.Points(pointGeometry);
        points.visible = false;
        this.cornerPoints = points;

        // Must add the point to root because otherwise they will not be
        // included in the transforms.
        this.root.add(this.cornerPoints);
    }

    createVizualizationBoundaryCell(origin, basis) {
        // Get cuboid
        let pointGeometry = this.createCornerPoints(origin, basis);
        let points = new THREE.Points(pointGeometry);
        points.visible = false;
        this.cornerPoints = points;

        // Must add the point to root because otherwise they will not be
        // included in the transforms.
        this.root.add(this.cornerPoints);
    }

    /**
     * Creates 8 corner points for the given cuboid.
     *
     * @param origin - The origin of the cuboid.
     * @param basis - The vectors that define the cuboid.
     */
    createCornerPoints(origin, basis) {

        var geometry = new THREE.Geometry();
        geometry.vertices.push(origin);
        let opposite = origin.clone().add(basis[0]).add(basis[1]).add(basis[2]);
        geometry.vertices.push(opposite);

        for (let len=basis.length, i=0; i<len; ++i) {
            // Corners close to origin
            let position1 = origin.clone().add(basis[i].clone());
            geometry.vertices.push(position1);

            // Corners close to opposite point of origin
            let position2 = opposite.clone().sub(basis[i].clone());
            geometry.vertices.push(position2);
        }

        return geometry;
    }

    /**
     * Create the conventional cell
     *
     */
    createConventionalCell(periodicity, visible) {
        let cell = this.createCell(new THREE.Vector3(), this.basisVectors, periodicity, 0x000000, 1.5, false);
        cell.visible = visible;
        this.convCell = cell;
        this.root.add(this.convCell);
    }

    /**
     * Create the primitive cell
     *
     */
    createPrimitiveCell(periodicity, visible) {
        if (this.primitiveVectors != null) {
            let cell = this.createCell(new THREE.Vector3(), this.primitiveVectors, periodicity, 0x000000, 1.5, true);
            cell.visible = visible;
            this.primCell = cell;
            this.root.add(this.primCell);
        }
    }

    /**
     * Creates outlines for a cell specified by the given basis vectors.
     * @param origin - The origin for the cell
     * @param basisVectors - The cell basis vectors
     * @param periodicity - The periodicity of the cell
     * @param color - Color fo the cell wireframe
     * @param linewidth - Line width fo the wireframe
     * @param dashed - Is wireframe dashed
     */
    createCell(origin, basisVectors, periodicity, color, linewidth:number, dashed:boolean) {

        let cell = new THREE.Object3D();
        let lineMaterial;
        if (dashed) {
            lineMaterial = new THREE.LineDashedMaterial({
                color: color,
                linewidth: linewidth,
                dashSize: 0.1,
                gapSize: 0.1
            });
        } else {
            lineMaterial = new THREE.LineBasicMaterial({
                color: color,
                linewidth: linewidth
            });
        }
        let dimMaterial = new THREE.LineDashedMaterial({
            color: "#999999",
            linewidth: linewidth,
            dashSize: 0.1,
            gapSize: 0.1
        });

        // Determine the if one of the cell vectors is a zero vector
        let collapsed = true;
        for (let i=0; i<3; ++i) {
            let vec = basisVectors[i];
            let len = vec.length();
            if (len > 1E-3 && !periodicity[i]) {
                collapsed = false;
            }
        }

        for (let len=basisVectors.length, i=0; i<len; ++i) {

            let basisVector = basisVectors[i].clone();

            // First line
            let line1Mat = lineMaterial.clone();
            let isDim1 = !periodicity[i];
            if (!(isDim1 && collapsed)) {
                if (isDim1) {
                    line1Mat = dimMaterial.clone();
                }
                let lineGeometry = new THREE.Geometry();
                lineGeometry.vertices.push(
                    origin.clone(),
                    basisVector.clone().add(origin)
                );
                let line = new THREE.Line(lineGeometry, line1Mat);
                cell.add( line );
                line.computeLineDistances();
            }

            // Second line
            let secondIndex = (i+1) % len;
            let secondAddition = basisVectors[secondIndex].clone();
            let isDim2 = !periodicity[i] || !periodicity[(i+1)%3];

            if (!(isDim2 && collapsed)) {
                let line2Mat = lineMaterial.clone();
                if (isDim2) {
                    line2Mat = dimMaterial.clone();
                }
                let line2Geometry = new THREE.Geometry();
                line2Geometry.vertices.push(
                    secondAddition.clone().add(origin),
                    basisVector.clone().add(secondAddition).add(origin)
                );
                let line2 = new THREE.Line(line2Geometry, line2Mat);
                cell.add( line2 );
                line2.computeLineDistances();
            }

            // Third line
            let thirdIndex = (i+2) % len;
            let thirdAddition = basisVectors[thirdIndex].clone();
            let isDim3 = !periodicity[i] || !periodicity[(i+2)%3];

            if (!(isDim3 && collapsed)) {
                let line3Mat = lineMaterial.clone();
                if (isDim3) {
                    line3Mat = dimMaterial.clone();
                }
                let line3Geometry = new THREE.Geometry();
                line3Geometry.vertices.push(
                    thirdAddition.clone().add(origin),
                    basisVector.clone().add(thirdAddition).add(origin)
                );
                let line3 = new THREE.Line( line3Geometry, line3Mat );
                cell.add( line3 );
                line3.computeLineDistances();
            }

            // Fourth line
            let isDim4 = !periodicity[i] || !periodicity[(i+2)%3] || !periodicity[(i+1)%3];
            if (!(isDim4 && collapsed)) {
                let line4Mat = lineMaterial.clone();
                if (isDim4) {
                    line4Mat = dimMaterial.clone();
                }
                let line4Geometry = new THREE.Geometry();
                line4Geometry.vertices.push(
                    secondAddition.clone().add(thirdAddition).add(origin),
                    basisVector.clone().add(secondAddition).add(thirdAddition).add(origin)
                );
                let line4 = new THREE.Line( line4Geometry, line4Mat );
                cell.add( line4 );
                line4.computeLineDistances();
            }
        }
        return cell;
    }

    /**
     * Setups the initial view so that the scene is centered and rotated
     * slightly to emphasize 3D nature.
     */
    setupInitialView1D(periodicity:boolean[]) {

        // Rotate so that the chosen axis points to top
        this.root.updateMatrixWorld();  // The positions are not otherwise updated properly

        let startAxis;
        for (let iAxis=0; iAxis < periodicity.length; ++iAxis) {
            let periodic = periodicity[iAxis];
            if (periodic) {
                startAxis = this.basisVectors[iAxis];
            }
        }
        let finalAxis = new THREE.Vector3(1, 0, 0);
        let segmentQ = new THREE.Quaternion().setFromUnitVectors(
            finalAxis,
            startAxis.clone().normalize()
        );
        segmentQ.conjugate()
        this.root.quaternion.premultiply(segmentQ);
        this.sceneInfo.quaternion.premultiply(segmentQ);

        // Get the camera up and right directions in world space
        let cameraUp = new THREE.Vector3( 0, 1, 0 );
        let cameraRight = new THREE.Vector3( 1, 0, 0);
        cameraRight.applyQuaternion( this.camera.quaternion );
        cameraUp.applyQuaternion( this.camera.quaternion );

        // Rotate around the camera up-axis
        let upAngle = Math.PI/4;
        this.rotateAroundWorldAxis(this.root, cameraUp, upAngle);
        this.rotateAroundWorldAxis(this.sceneInfo, cameraUp, upAngle);

        // Rotate around the camera right-axis
        let rightAngle = Math.PI/9;
        this.rotateAroundWorldAxis(this.root, cameraRight, rightAngle);
        this.rotateAroundWorldAxis(this.sceneInfo, cameraRight, rightAngle);
    }

    /**
     * Setups the initial view so that the scene is centered and rotated
     * slightly to emphasize 3D nature.
     */
    setupInitialView2D(periodicity:boolean[], periodicIndices) {

        let a = this.basisVectors[periodicIndices[0]].clone();
        let c = [1, 1, 1];
        for (let i=0; i < periodicIndices.length; ++i) {
            let periodic = periodicIndices[i];
            c[periodic] = 0;
        }
        c = new THREE.Vector3().fromArray(c);

        // Rotate so that the chosen axis points to top
        this.root.updateMatrixWorld();  // The positions are not otherwise updated properly

        let finalAxis = new THREE.Vector3(0, 0, 1);
        let segmentQ = new THREE.Quaternion().setFromUnitVectors(
            c.clone().normalize(),
            finalAxis
        );
        this.root.quaternion.premultiply(segmentQ);
        this.sceneInfo.quaternion.premultiply(segmentQ);
        a = a.clone().applyQuaternion(segmentQ);
        c = c.clone().applyQuaternion(segmentQ);

        // Rotate so that a points to the right
        finalAxis = new THREE.Vector3(1, 0, 0);
        segmentQ = new THREE.Quaternion().setFromUnitVectors(
            a.clone().normalize(),
            finalAxis
        );
        this.root.quaternion.premultiply(segmentQ);
        this.sceneInfo.quaternion.premultiply(segmentQ);

        // The positions are not otherwise updated properly
        this.root.updateMatrixWorld();
        this.sceneInfo.updateMatrixWorld();

        // Tilt the system slightly
        let cameraRight = new THREE.Vector3(1, 0, 0);
        cameraRight.applyQuaternion( this.camera.quaternion );
        let rightAngle = -Math.PI/6;
        this.rotateAroundWorldAxis(this.root, cameraRight, rightAngle);
        this.rotateAroundWorldAxis(this.sceneInfo, cameraRight, rightAngle);
    }

    /**
     * Setups the initial view so that the scene is centered and rotated
     * slightly to emphasize 3D nature.
     */
    setupInitialView3D() {

        let a = this.basisVectors[0];
        let b = this.basisVectors[1];
        let c = this.basisVectors[2];

        // Rotate so that the c-axis points to top
        this.root.updateMatrixWorld();  // The positions are not otherwise updated properly

        let finalCAxis = new THREE.Vector3(0, 1, 0);
        let cQuaternion = new THREE.Quaternion().setFromUnitVectors(
            c.clone().normalize(),
            finalCAxis
        );
        this.root.quaternion.premultiply(cQuaternion);
        this.sceneInfo.quaternion.premultiply(cQuaternion);
        this.root.updateMatrixWorld();
        this.sceneInfo.updateMatrixWorld();
        b = b.clone().applyQuaternion(cQuaternion);
        c = c.clone().applyQuaternion(cQuaternion);

        // Rotate so that c x b points to the right
        let currentAAxis = new THREE.Vector3().crossVectors(b, c);
        let finalAAxis = new THREE.Vector3(0, 0, 1);
        let aQuaternion = new THREE.Quaternion().setFromUnitVectors(
            currentAAxis.clone().normalize(),
            finalAAxis
        );
        this.root.quaternion.premultiply(aQuaternion);
        this.sceneInfo.quaternion.premultiply(aQuaternion);
        this.root.updateMatrixWorld();
        this.sceneInfo.updateMatrixWorld();
        b = b.clone().applyQuaternion(aQuaternion);
        c = c.clone().applyQuaternion(aQuaternion);

        let cameraVector = new THREE.Vector3( 0, 0, - 1 );
        cameraVector.applyQuaternion( this.camera.quaternion );

        // Rotate around the c-axis
        let tiltAxis2 = new THREE.Vector3().crossVectors(cameraVector, b);
        tiltAxis2.normalize();
        //let tiltAngle2 = -Math.PI/3;
        let tiltAngle2 = -Math.PI/6;
        this.rotateAroundWorldAxis(this.root, tiltAxis2, tiltAngle2);
        this.rotateAroundWorldAxis(this.sceneInfo, tiltAxis2, tiltAngle2);

        // Rotate around the axis defined by the cross-product of the
        // cameraVector and basis vector c
        let tiltAxis = new THREE.Vector3().crossVectors(cameraVector, c);
        tiltAxis.normalize();
        //let tiltAngle = Math.PI/6;
        let tiltAngle = Math.PI/12;
        this.rotateAroundWorldAxis(this.root, tiltAxis, tiltAngle);
        this.rotateAroundWorldAxis(this.sceneInfo, tiltAxis, tiltAngle);
    }


    /**
     * Creates representation for all the given atoms.
     *
     * @param positions - Positions of the atoms
     * @param labels - The element numbers for the atoms
     */
    createAtoms(relPositions, labels, duplicate) {
        this.elements = {};
        this.atomPos = [];
        this.atomNumbers = [];
        this.atomFills = [];
        this.atomOutlines = [];
        let basis1 = this.basisVectors[0];
        let basis2 = this.basisVectors[1];
        let basis3 = this.basisVectors[2];
        let meshMap = {};


        for (let len=relPositions.length, i=0; i<len; ++i) {
            let iRelPos = relPositions[i];

            // Add the primary atom
            let atomicNumber = labels[i];
            this.addAtom(i, iRelPos, atomicNumber, meshMap);

            // Gather element legend data
            let elementName = this.elementNames[atomicNumber-1];
            this.elements[elementName] = [this.elementColors[atomicNumber], this.elementRadii[atomicNumber]];

            // If the atom sits on the cell surface, add the mirror images if
            // requested.
            if (duplicate) {
                let x = iRelPos.x;
                let y = iRelPos.y;
                let z = iRelPos.z;
                let xZero = this.almostEqual(0, x, basis1, this.wrapTolerance);
                let yZero = this.almostEqual(0, y, basis2, this.wrapTolerance);
                let zZero = this.almostEqual(0, z, basis3, this.wrapTolerance);;

                if (xZero && yZero && zZero) {
                    this.addAtom(i, new THREE.Vector3(1,0,0), atomicNumber, meshMap);
                    this.addAtom(i, new THREE.Vector3(0,1,0), atomicNumber, meshMap);
                    this.addAtom(i, new THREE.Vector3(0,0,1), atomicNumber, meshMap);
                    this.addAtom(i, new THREE.Vector3(1,1,0), atomicNumber, meshMap);
                    this.addAtom(i, new THREE.Vector3(0,1,1), atomicNumber, meshMap);
                    this.addAtom(i, new THREE.Vector3(1,0,1), atomicNumber, meshMap);
                    this.addAtom(i, new THREE.Vector3(1,1,1), atomicNumber, meshMap);
                } else if(xZero && yZero && !zZero) {
                    this.addAtom(i, iRelPos.clone().add(new THREE.Vector3(1,0,0)), atomicNumber, meshMap);
                    this.addAtom(i, iRelPos.clone().add(new THREE.Vector3(0,1,0)), atomicNumber, meshMap);
                    this.addAtom(i, iRelPos.clone().add(new THREE.Vector3(1,1,0)), atomicNumber, meshMap);
                } else if(!xZero && yZero && zZero) {
                    this.addAtom(i, iRelPos.clone().add(new THREE.Vector3(0,1,0)), atomicNumber, meshMap);
                    this.addAtom(i, iRelPos.clone().add(new THREE.Vector3(0,0,1)), atomicNumber, meshMap);
                    this.addAtom(i, iRelPos.clone().add(new THREE.Vector3(0,1,1)), atomicNumber, meshMap);
                } else if(xZero && !yZero && zZero) {
                    this.addAtom(i, iRelPos.clone().add(new THREE.Vector3(1,0,0)), atomicNumber, meshMap);
                    this.addAtom(i, iRelPos.clone().add(new THREE.Vector3(0,0,1)), atomicNumber, meshMap);
                    this.addAtom(i, iRelPos.clone().add(new THREE.Vector3(1,0,1)), atomicNumber, meshMap);
                } else if(xZero && !yZero && !zZero) {
                    this.addAtom(i, iRelPos.clone().add(new THREE.Vector3(1,0,0)), atomicNumber, meshMap);
                } else if(!xZero && yZero && !zZero) {
                    this.addAtom(i, iRelPos.clone().add(new THREE.Vector3(0,1,0)), atomicNumber, meshMap);
                } else if(!xZero && !yZero && zZero) {
                    this.addAtom(i, iRelPos.clone().add(new THREE.Vector3(0,0,1)), atomicNumber, meshMap);
                }
            }
        }
    }

    /**
     * Creates bonds between the atoms based on radii and distance.
     *
     * @param bonds - A Nx2 list of atom indices specifying the bonded atoms. Alternatively
     *                you can use "auto" to automatically create the bonds.
     */
    createBonds(bonds="auto") {
        this.bondFills = []

        // Manual bonds
        if (Array.isArray(bonds)) {
            for (let bond of bonds) {
                let i = bond[0];
                let j = bond[1];
                let pos1 = this.atomPos[i];
                let pos2 = this.atomPos[j];
                console.log(i, j, pos1, pos2);
                this.addBond(i, j, pos1, pos2);
            }
        // Automatically detect bonds
        } else if (bonds === "auto") {
            let nAtoms = this.atomPos.length;
            for (let i=0; i < nAtoms; ++i) {
                for (let j=0; j < nAtoms; ++j) {
                    if (j > i) {
                        let pos1 = this.atomPos[i];
                        let pos2 = this.atomPos[j];
                        let num1 = this.atomNumbers[i];
                        let num2 = this.atomNumbers[j];
                        let distance = pos2.clone().sub(pos1).length()
                        let radii1 = this.options.radiusScale*this.elementRadii[num1]
                        let radii2 = this.options.radiusScale*this.elementRadii[num2]
                        if (distance <= this.options.bondScale*1.1*(radii1 + radii2)) {
                            this.addBond(i, j, pos1, pos2);
                        }
                    }
                }
            }
        }
    }

     /**
      * Used to check if the given relative position component is almost the
      * given target value with a tolerance given in cartesian corodinates.
      */
    almostEqual(target:number, coordinate:number, basisVector:any, tolerance:number) {
        let relDistance = (coordinate - target);
        let absDistance = Math.abs(basisVector.clone().multiplyScalar(relDistance).length());
        if (absDistance < tolerance) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * Creates atom to the scene.
     *
     * @param position - Position of the atom
     * @param atomicNumber - The atomic number for the added atom
     * @param relative - Are the coordinates relatice to the cell basis vectors
     */
    addBond(i, j, pos1, pos2) {
        // Bond
        let radius = 0.08;
        let bondMaterial = new THREE.MeshPhongMaterial( { color: 0xFFFFFF, shininess: 30} );
        let cylinder = this.createCylinder(pos1, pos2, radius, 10, bondMaterial);
        cylinder.name = "fill";
        this.bondFills.push(cylinder);

        // Bond outline hack
        let addition = 0.02;
        let scale = addition/radius + 1;
        let outlineMaterial = new THREE.MeshBasicMaterial({color : 0x000000, side: THREE.BackSide});
        let outline = this.createCylinder(pos1, pos2, scale*radius, 10, outlineMaterial);
        outline.name = "outline";

        // Put all vonds visuals inside a named group
        let group = new THREE.Group();
        group.name = "bond" + i + "-" + j;
        group.add(cylinder);
        group.add(outline);
        this.bonds.add(group);
    }

    /**
     * Creates atoms.
     *
     * @param position - Position of the atom
     * @param atomicNumber - The atomic number for the added atom
     * @param relative - Are the coordinates relatice to the cell basis vectors
     */
    createAtom(position, atomicNumber, meshMap, relative:boolean=true) {

        let exists = atomicNumber in meshMap;
        if (!exists) {
            // Calculate the amount of segments that are needed to reach a
            // certain angle for the ball surface segements
            let radius = this.options.radiusScale*this.elementRadii[atomicNumber];
            let targetAngle = 165;
            let nSegments = Math.ceil(360/(180-targetAngle));

            // Atom
            let color = this.elementColors[atomicNumber];
            let atomGeometry = new THREE.SphereGeometry( radius, nSegments, nSegments );
            let atomMaterial = new THREE.MeshPhongMaterial( { color: color, shininess: 30);
            let atom = new THREE.Mesh( atomGeometry, atomMaterial );

            // Atom outline hack
            let addition = 0.03;
            let scale = addition/radius + 1;
            let outlineGeometry = new THREE.SphereGeometry( radius*scale, nSegments, nSegments );
            let outlineMaterial = new THREE.MeshBasicMaterial({color : 0x000000, side: THREE.BackSide});
            let outline = new THREE.Mesh( outlineGeometry, outlineMaterial );

            meshMap[atomicNumber] = {"atom": atom, "outline": outline}
        }
        let mesh = meshMap[atomicNumber];
        let true_pos = new THREE.Vector3();
        if (relative) {
            true_pos.add(this.basisVectors[0].clone().multiplyScalar(position.x));
            true_pos.add(this.basisVectors[1].clone().multiplyScalar(position.y));
            true_pos.add(this.basisVectors[2].clone().multiplyScalar(position.z));
        } else {
            true_pos.copy(position);
        }

        // Add atom
        let atom = mesh["atom"].clone();
        atom.position.copy(true_pos)

        // Add atom outline
        let outline = mesh["outline"].clone();
        outline.position.copy(true_pos);

        return [atom, outline, true_pos];
    }

    /**
     * Creates atoms and directly adds themto the scene.
     *
     * @param position - Position of the atom
     * @param atomicNumber - The atomic number for the added atom
     * @param relative - Are the coordinates relatice to the cell basis vectors
     */
    addAtom(index, position, atomicNumber, mesh, relative:boolean=true) {
        let atomData = this.createAtom(position, atomicNumber, mesh, relative);
        let atom = atomData[0];
        let outline = atomData[1];
        let pos = atomData[2];

        // Put all atoms visuals inside a named group
        let group = new THREE.Group();
        group.name = "atom"+index;
        atom.name = "fill";
        outline.name = "outline";
        group.add(atom)
        group.add(outline)
        this.atoms.add(group)

        this.atomFills.push(atom);
        this.atomOutlines.push(outline);
        this.atomPos.push(pos);
        this.atomNumbers.push(atomicNumber);
    }

    /*
     * A modified render-function that scales the labels according to the zoom
     * level.
     */
    render() {

        let canvas = this.rootElement;
        let canvasWidth = canvas.clientWidth;
        let canvasHeight = canvas.clientHeight;

        // Project a [1,0,0] vector in the camera space to the world space, and
        // then to the screen space. The length of this vector is then used to
        // scale the labels.
        let x = new THREE.Vector3(1, 0, 0);
        let origin = new THREE.Vector3(0, 0, 0);
        let vectors = [x, origin]
        for (let i=0; i < vectors.length; ++i) {
            let vec = vectors[i];
            this.camera.localToWorld(vec);
            vec.project( this.camera );
            vec.x = Math.round( (   vec.x + 1 ) * canvasWidth  / 2 );
            vec.y = Math.round( ( - vec.y + 1 ) * canvasHeight / 2 );
        }

        let displacement = new THREE.Vector3().subVectors(origin, x);
        let distance = displacement.length();
        let scale = 8*1/Math.pow(distance, 0.5);  // The sqrt makes the scaling behave nicer...

        if (this.axisLabels !== undefined) {
            for (let i=0; i < this.axisLabels.length; ++i) {
                let label = this.axisLabels[i];
                label.scale.set(scale, scale, 1);
            }
        }
        super.render();
    }

    /**
     * Setup the view for 0D systems (atoms, molecules).
     */
    setup0D(relPos, cartPos, labels) {
        this.createConventionalCell([false, false, false], this.options.showCell);
        this.createPrimitiveCell([false, false, false], this.options.showCell);
        this.createAtoms(relPos, labels, false);
        this.createLatticeParameters(this.basisVectors, [false, false, false]);
    }

    /**
     * Replicates the structure along the specified direction to emphasize the
     * 1D nature of the material.
     *
     * @param dim - The index of the periodic dimension.
     */
    setup1D(relPos, cartPos, labels, periodicity, periodicIndices) {

        let dim = periodicIndices[0]
        let trans = new THREE.Vector3()
        trans.setComponent(dim, 1);

        // Duplicate the cell in the periodic dimensions. The number of
        // duplications is determined so that a certain size is achieved.
        let translation1 = this.basisVectors[dim].clone();
        let multiplier = this.getRepetitions(translation1, 15);

        // Multiply the structure in the periodic dimension
        let newPos = [];
        let newLabels = [];
        for(let i = 1; i <= multiplier; ++i) {

            // Add in front
            let frontTranslation = trans.clone().multiplyScalar(i)
            for (let k=0; k < relPos.length; ++k) {
                let iPos = new THREE.Vector3().copy(relPos[k]);
                iPos.add(frontTranslation);
                let iLabel = labels[k];
                newPos.push(iPos);
                newLabels.push(iLabel);
            }

            // Add in front
            let backTranslation = trans.clone().multiplyScalar(-i)
            for (let k=0; k < relPos.length; ++k) {
                let iPos = new THREE.Vector3().copy(relPos[k]);
                iPos.add(backTranslation);
                let iLabel = labels[k];
                newPos.push(iPos);
                newLabels.push(iLabel);
            }
        }
        relPos.push.apply(relPos, newPos);
        labels.push.apply(labels, newLabels);

        if (this.options.showCell) {
            this.createConventionalCell(periodicity);
            this.createPrimitiveCell(periodicity);
        }
        this.createAtoms(relPos, labels, false);

        this.createLatticeParameters(this.basisVectors, periodicity);

        this.setupInitialView1D(periodicity);
    }

    /**
     * Used to get a number of repetitions that are needed for the given
     * latticevector to reach the target size.
     *
     * @param latticeVector - The vector that is to be extended.
     * @param targetSize - The targeted size.
     */
    getRepetitions(latticeVector, targetSize) {
        let vectorLen = latticeVector.length();
        let multiplier = Math.max(Math.floor(targetSize/vectorLen)-1, 1);

        return multiplier;
    }

    /**
     * Replicates the structure along the specified direction to emphasize the
     * 2D nature of the material.
     *
     * @param periodicIndices - The indices of the periodic dimension.
     */
    setup2D(relPos, cartPos, labels, periodicity, periodicIndices) {
        let dim1 = periodicIndices[0]
        let dim2 = periodicIndices[1]

        let relTrans1 = new THREE.Vector3()
        relTrans1.setComponent(dim1, 1);
        let relTrans2 = new THREE.Vector3()
        relTrans2.setComponent(dim2, 1);

        // Duplicate the cell in the periodic dimensions. The number of
        // duplications is determined so that a certain size is achieved.
        let translation1 = this.basisVectors[dim1].clone();
        let translation2 = this.basisVectors[dim2].clone();
        let width = 0;
        let height = 0;
        if (this.options.allowRepeat) {
            width = this.getRepetitions(translation1, 12);
            height = this.getRepetitions(translation2, 12);
        }

        let newPos = [];
        let newLabels = [];

        for(let i = 0; i <= width; ++i) {
            for(let j = 0; j <= height; ++j) {
                if (!(i == 0 && j == 0)) {

                    // Add clone to the current coordinate
                    let xTranslation = relTrans1.clone().multiplyScalar(i)
                    let yTranslation = relTrans2.clone().multiplyScalar(j)

                    // Add in front
                    //let frontTranslation = trans.clone().multiplyScalar(i)
                    for (let k=0; k < relPos.length; ++k) {
                        let iPos = new THREE.Vector3().copy(relPos[k]);
                        iPos.add(xTranslation);
                        iPos.add(yTranslation);
                        let iLabel = labels[k];
                        newPos.push(iPos);
                        newLabels.push(iLabel);
                    }
                }
            }
        }

        relPos.push.apply(relPos, newPos);
        labels.push.apply(labels, newLabels);

        this.createConventionalCell(periodicity, this.options.showCell);
        this.createPrimitiveCell(periodicity, this.options.showCell);
        this.createAtoms(relPos, labels, false);

        this.createLatticeParameters(this.basisVectors, periodicity, periodicIndices);
        this.setupInitialView2D(periodicity, periodicIndices);
    }

    /**
     * Setup the view for 3D systems (crystals)
     */
    setup3D(relPos, cartPos, labels) {
        this.createConventionalCell([true, true, true], this.options.showCell);
        this.createPrimitiveCell([true, true, true], this.options.showCell);

        this.createAtoms(relPos, labels, this.options.showCopies);

        this.createLatticeParameters(this.basisVectors, [true, true, true]);
        this.setupInitialView3D();
    }

	elementNames:string[] = [
	  'H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne', 'Na', 'Mg', 'Al', 'Si',  // Si = 14
	  'P', 'S', 'Cl', 'Ar', 'K', 'Ca', 'Sc', 'Ti', 'V', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', // Nin = 28
	  'Cu', 'Zn', 'Ga', 'Ge', 'As', 'Se', 'Br', 'Kr', 'Rb', 'Sr', 'Y', 'Zr', 'Nb',  // Nb = 41
	  'Mo', 'Tc', 'Ru', 'Rh', 'Pd', 'Ag', 'Cd', 'In', 'Sn', 'Sb', 'Te', 'I', 'Xe',  // Xe = 54
	  'Cs', 'Ba', 'La', 'Ce', 'Pr', 'Nd', 'Pm', 'Sm', 'Eu', 'Gd', 'Tb', 'Dy', 'Ho', // Ho= 67
	  'Er', 'Tm', 'Yb', 'Lu', 'Hf', 'Ta', 'W', 'Re', 'Os', 'Ir', 'Pt', 'Au', 'Hg',  // Hg = 80
	  'Tl', 'Pb', 'Bi', 'Po', 'At', 'Rn', 'Fr', 'Ra', 'Ac', 'Th', 'Pa', 'U', 'Np',  // Np = 93
	  'Pu', 'Am', 'Cm', 'Bk', 'Cf', 'Es', 'Fm', 'Md', 'No', 'Lr', 'Rf', 'Ha', 'Sg', // sg = 106
	  'Ns', 'Hs', 'Mt', 'Ds', 'Rg', 'Cn', 'Nh', 'Fl', 'Mc', 'Lv', 'Ts', 'Og' // Mt = 109
	];

    elementNumbers:object = {
        'H': 1,  'He': 2, 'Li': 3, 'Be': 4,
        'B': 5,  'C': 6,  'N': 7,  'O': 8,  'F': 9,
        'Ne': 10, 'Na': 11, 'Mg': 12, 'Al': 13, 'Si': 14,
        'P': 15,  'S': 16,  'Cl': 17, 'Ar': 18, 'K': 19,
        'Ca': 20, 'Sc': 21, 'Ti': 22, 'V': 23,  'Cr': 24,
        'Mn': 25, 'Fe': 26, 'Co': 27, 'Ni': 28, 'Cu': 29,
        'Zn': 30, 'Ga': 31, 'Ge': 32, 'As': 33, 'Se': 34,
        'Br': 35, 'Kr': 36, 'Rb': 37, 'Sr': 38, 'Y': 39,
        'Zr': 40, 'Nb': 41, 'Mo': 42, 'Tc': 43, 'Ru': 44,
        'Rh': 45, 'Pd': 46, 'Ag': 47, 'Cd': 48, 'In': 49,
        'Sn': 50, 'Sb': 51, 'Te': 52, 'I': 53,  'Xe': 54,
        'Cs': 55, 'Ba': 56, 'La': 57, 'Ce': 58, 'Pr': 59,
        'Nd': 60, 'Pm': 61, 'Sm': 62, 'Eu': 63, 'Gd': 64,
        'Tb': 65, 'Dy': 66, 'Ho': 67, 'Er': 68, 'Tm': 69,
        'Yb': 70, 'Lu': 71, 'Hf': 72, 'Ta': 73, 'W': 74,
        'Re': 75, 'Os': 76, 'Ir': 77, 'Pt': 78, 'Au': 79,
        'Hg': 80, 'Tl': 81, 'Pb': 82, 'Bi': 83, 'Po': 84,
        'At': 85, 'Rn': 86, 'Fr': 87, 'Ra': 88, 'Ac': 89,
        'Th': 90, 'Pa': 91, 'U': 92,  'Np': 93, 'Pu': 94,
        'Am': 95, 'Cm': 96, 'Bk': 97, 'Cf': 98, 'Es': 99,
        'Fm': 100, 'Md': 101, 'No': 102, 'Lr': 103,
    };


    //  Covalent radii revisited,
    //  Beatriz Cordero, Verónica Gómez, Ana E. Platero-Prats, Marc Revés,
    //  Jorge Echeverría, Eduard Cremades, Flavia Barragán and Santiago Alvarez,
    //  Dalton Trans., 2008, 2832-2838 DOI:10.1039/B801115J
    missing = 0.2;
    elementRadii:number[] = [
        this.missing,
        0.31,
        0.28,
        1.28,
        0.96,
        0.84,
        0.76,
        0.71,
        0.66,
        0.57,
        0.58,
        1.66,
        1.41,
        1.21,
        1.11,
        1.07,
        1.05,
        1.02,
        1.06,
        2.03,
        1.76,
        1.7,
        1.6,
        1.53,
        1.39,
        1.39,
        1.32,
        1.26,
        1.24,
        1.32,
        1.22,
        1.22,
        1.2,
        1.19,
        1.2,
        1.2,
        1.16,
        2.2,
        1.95,
        1.9,
        1.75,
        1.64,
        1.54,
        1.47,
        1.46,
        1.42,
        1.39,
        1.45,
        1.44,
        1.42,
        1.39,
        1.39,
        1.38,
        1.39,
        1.4,
        2.44,
        2.15,
        2.07,
        2.04,
        2.03,
        2.01,
        1.99,
        1.98,
        1.98,
        1.96,
        1.94,
        1.92,
        1.92,
        1.89,
        1.9,
        1.87,
        1.87,
        1.75,
        1.7,
        1.62,
        1.51,
        1.44,
        1.41,
        1.36,
        1.36,
        1.32,
        1.45,
        1.46,
        1.48,
        1.4,
        1.5,
        1.5,
        2.6,
        2.21,
        2.15,
        2.06,
        2.0,
        1.96,
        1.9,
        1.87,
        1.8,
        1.69,
        this.missing,
        this.missing,
        this.missing,
        this.missing,
        this.missing,
        this.missing,
        this.missing,
    ]
    // Jmol colors. See: http://jmol.sourceforge.net/jscolors/#color_U
    elementColors:number[] = [
        0xff0000,
        0xffffff,
        0xd9ffff,
        0xcc80ff,
        0xc2ff00,
        0xffb5b5,
        0x909090,
        0x3050f8,
        0xff0d0d,
        0x90e050,
        0xb3e3f5,
        0xab5cf2,
        0x8aff00,
        0xbfa6a6,
        0xf0c8a0,
        0xff8000,
        0xffff30,
        0x1ff01f,
        0x80d1e3,
        0x8f40d4,
        0x3dff00,
        0xe6e6e6,
        0xbfc2c7,
        0xa6a6ab,
        0x8a99c7,
        0x9c7ac7,
        0xe06633,
        0xf090a0,
        0x50d050,
        0xc88033,
        0x7d80b0,
        0xc28f8f,
        0x668f8f,
        0xbd80e3,
        0xffa100,
        0xa62929,
        0x5cb8d1,
        0x702eb0,
        0x00ff00,
        0x94ffff,
        0x94e0e0,
        0x73c2c9,
        0x54b5b5,
        0x3b9e9e,
        0x248f8f,
        0x0a7d8c,
        0x006985,
        0xc0c0c0,
        0xffd98f,
        0xa67573,
        0x668080,
        0x9e63b5,
        0xd47a00,
        0x940094,
        0x429eb0,
        0x57178f,
        0x00c900,
        0x70d4ff,
        0xffffc7,
        0xd9ffc7,
        0xc7ffc7,
        0xa3ffc7,
        0x8fffc7,
        0x61ffc7,
        0x45ffc7,
        0x30ffc7,
        0x1fffc7,
        0x00ff9c,
        0x00e675,
        0x00d452,
        0x00bf38,
        0x00ab24,
        0x4dc2ff,
        0x4da6ff,
        0x2194d6,
        0x267dab,
        0x266696,
        0x175487,
        0xd0d0e0,
        0xffd123,
        0xb8b8d0,
        0xa6544d,
        0x575961,
        0x9e4fb5,
        0xab5c00,
        0x754f45,
        0x428296,
        0x420066,
        0x007d00,
        0x70abfa,
        0x00baff,
        0x00a1ff,
        0x008fff,
        0x0080ff,
        0x006bff,
        0x545cf2,
        0x785ce3,
        0x8a4fe3,
        0xa136d4,
        0xb31fd4,
        0xb31fba,
        0xb30da6,
        0xbd0d87,
        0xc70066,
        0xcc0059,
        0xd1004f,
        0xd90045,
        0xe00038,
        0xe6002e,
        0xeb0026,
    ]
}
