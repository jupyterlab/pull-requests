// From https://github.com/jupyterlab/jupyterlab-monaco

const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: {
    // Package each language's worker and give these filenames in `getWorkerUrl`
    "editor.worker": 'monaco-editor/esm/vs/editor/editor.worker.js',
  },
  output: {
    filename: 'JUPYTERLAB_FILE_LOADER_jupyterlab-pullrequests-[name].bundle.js',
    path: path.resolve(__dirname, 'lib'),
    globalObject: 'self'
  },
  module: {
    rules: [{
      test: /\.css$/,
      use: ['style-loader', 'css-loader']
    }]
  },
  mode: 'development',
  devtool: 'source-map',
  plugins: [
    // Ignore require() calls in vs/language/typescript/lib/typescriptServices.js
    new webpack.IgnorePlugin(
      /^((fs)|(path)|(os)|(crypto)|(source-map-support))$/,
      /vs\/language\/typescript\/lib/
    )
  ]
};