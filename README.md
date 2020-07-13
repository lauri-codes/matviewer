# IMPORTANT
This repository has been deprecated in favour of [materia](https://github.com/lauri-codes/materia).

# MatViewer
 A three.js based viewer for visualizing materials related information.
 Currently supports:
  * Visualization of geometries, crystals, 2D materials, 1D materials and finite systems.
  * Visualization of Brillouin zones.

# Examples
TODO: Include example pictures.

## Call Syntax
TODO: Include a call syntax to the viewers.

# How to use the visualizer
Once you have the visualizer opened, you can manipulate the system with mouse. You
can rotate by dragging with left mouse button, translate by dragging with right
mouse button pressed, and zoom with mouse wheel.

# Production installation
To use the library on a web-server, there is a final build available in the
"build"-directory. Using the library requires to copy these files to a server
environment, and then follow the example given in index.html and index.js for
usage. Notice that the build is is provided for an environment using System.js
as a module loading system. If you wish to build the library for some other
module system, see the development section.

# Development
The library is packaged as a npm package, and to install the development
requirements run "npm install".

For development convenience there is a command "npm run dev", that will compile
the source files into a new build and start a local server to display the
example specified by index.html and index.js.

If you wish to build the library for some other model loading system, such as
CommonJS or ES6, you will need to modify the "compilerOptions.module"-setting
in the file tsconfig.json, and then build the library with "gulp build"

# Build Files
Here is a list of the files that are included in the build:

Modules:
 - build/js/brillouinzoneviewer.js: Contains the visualization code for Brillouin zones
 - build/js/structureviewer.js: Contains the visualization code for atomic structures
 - build/js/viewer.js: Contains the base class for all 3D viewers

Scripts:
 - build/js/rafpolyfill.js: Polyfill for the requestAnimationFrame function
 - build/js/three.min.js: The three.js library
 - build/js/CanvasRenderer.js: A HTML canvas fallback if WebGL is not available
 - build/js/Projector.js: Utilities for pojecting 3D into HTML canvas is WebGL
   is not available
 - build/js/orthographiccontrols.js: Contain the code for handling mouse
   controls with an orthographic camera
 - build/js/dat.gui.min.js: A small library that is used to create the settings
   window

Styles:
 - build/css/viewerstyle.css: Contains some style definitions for the
   information that is layed on top the the 3D canvas (element legend, the
   dat.gui settings window) IMPORTANT!: Currently this needs to be loaded
   before loading THE dat.gui.min.js script. Otherwise the styles will not
   apply (the script will override the styles)

Module management:
 - build/js/system.js: Module management with system.js, not needed if you use
   some other module system.


# Screenshot generation
The visualizer can also export screenshots, more details incoming.

# Technologies

 * three.js: Javascript library for easy creation of 3D content with WebGL.
 * Gulp: Gulp is used to manage all the development tasks in one script. It
   makes it easy to chain different tasks, move files around and watch changes
   in files.
 * npm: is used to handle the development requirements and to initialize the
   development environment.
 * [System.js](https://github.com/systemjs/systemjs) allows one to modularize
   Javascript code easily, by using import and export commands. You can easily
   remove this feature in a production environment, or replace it with
   something else, like webpack, if you want.
 * TypeScript: The source code has been written in TypeScript, which is
   transpiled into ES6 Javascript.
