const path = require('path');

module.exports = {
  entry: [
      './src/js/structureviewer.js',
  ],
  output: {
    path: path.resolve(__dirname, 'dist/js'),
    filename: 'structureviewer.min.js',
    library: 'matviewer',
    libraryTarget: 'var'
  }
};
