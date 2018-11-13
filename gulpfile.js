var gulp = require('gulp');
var ts = require('gulp-typescript');

var tsProject = ts.createProject("tsconfig.json");

var paths = {
  typescript: './src/ts/**/*.ts',
  javascript: './src/js/**/*.js',
  css: './src/css/**/*.css',
  nodemodules: [
      './node_modules/three/build/three.min.js',
      './node_modules/three/examples/js/renderers/Projector.js',
      './node_modules/three/examples/js/renderers/CanvasRenderer.js',
      './node_modules/systemjs/dist/system.js',
      './node_modules/dat.gui/build/dat.gui.min.js'
  ]
};



// Compile own TypeScript
gulp.task('typescript', function () {
    // Build Typescript
    return gulp.src([paths.typescript])
        .pipe(tsProject())
        .js.pipe(gulp.dest('./build/js'));
});

// Copy javascript files to build
gulp.task('copy-javascript', function() {
    gulp.src(paths.javascript).pipe(gulp.dest('./build/js'));
});

// Copy css files to build
gulp.task('copy-css', function() {
    gulp.src(paths.css).pipe(gulp.dest('./build/css'));
});

// Copy files from node-modules
gulp.task('copy-node-modules', function() {
    gulp.src(paths.nodemodules).pipe(gulp.dest('./build/js'));
});

// Rerun the typescript compilation on file change
gulp.task('watch', function() {
  gulp.watch([paths.typescript], ['typescript']);
});

// Build task
gulp.task('build', ["typescript", "copy-css", "copy-javascript", "copy-node-modules"]);

// The default task (called when you run `gulp` from cli)
gulp.task('default', ["build", "watch"]);
