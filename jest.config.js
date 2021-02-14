'use strict';

module.exports = {
  automock: false,
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  moduleNameMapper: {
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
    "monaco-editor": "<rootDir>/node_modules/react-monaco-editor"
  },
  testRegex: 'src/tests/.*.spec.ts[x]?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testPathIgnorePatterns: ['/dev_mode/', '/lib/', '/node_modules/', ".*\\.d\\.ts$"],
  transformIgnorePatterns: ['/node_modules/(?!(@jupyterlab/.*)/)'],
  setupFiles: ['./setupJest.js']
};