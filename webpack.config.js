const path = require('path');

module.exports = {
  entry: [
      './src/js/entry.js',
  ],
  output: {
    path: path.resolve(__dirname, 'dist/js'),
    filename: 'matviewer.min.js',
    library: 'matviewer',
    libraryTarget: 'var'
  }
};
