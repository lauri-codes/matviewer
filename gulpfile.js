var gulp = require('gulp');
var ts = require('gulp-typescript');
const webpack = require('webpack');
const webpackConfig = require('./webpack.config.js');

var tsProject = ts.createProject("tsconfig.json");

var paths = {
  typescript: './src/ts/**/*.ts',
  javascript: './src/js/**/*.js',
  css: './src/css/**/*.css',
  nodemodules: [
      './node_modules/three/build/three.min.js',
      './node_modules/dat.gui/build/dat.gui.min.js'
  ]
};

// Compile own TypeScript
gulp.task('typescript', function(done) {
    // Build Typescript
    return gulp.src([paths.typescript])
        .pipe(tsProject())
        .js.pipe(gulp.dest('./src/js'));
});

// Copy files from node-modules
gulp.task('copy-node-modules', function(done) {
    gulp.src(paths.nodemodules).pipe(gulp.dest('./dist/js'));
    done();
});

// Run webpack
gulp.task('webpack', function(done) {
    return new Promise((resolve, reject) => {
        webpack(webpackConfig, (err, stats) => {
            if (err) {
                return reject(err);
            }
            if (stats.hasErrors()) {
                return reject(new Error(stats.compilation.errors.join('\n')));
            }
            resolve();
        });
    });
});

// Build task
gulp.task('build', gulp.series("typescript", "copy-node-modules", "webpack"));

// Development task
gulp.task('develop', function(done) {
  gulp.watch([paths.typescript], gulp.series("typescript", "webpack"));
  done();
});

// The default task (called when you run `gulp` from cli)
gulp.task('default', gulp.series("build", "develop"));
