const jestJupyterLab = require('@jupyterlab/testutils/lib/jest-config');

const jlabConfig = jestJupyterLab('@jupyterlab/pullrequests', __dirname);

const esModules = [
  '.*@jupyterlab/',
  'lib0',
  'react-spinners',
  'y\\-protocols',
  'y\\-websocket',
  'yjs'
].join('|');

const {
  coverageDirectory,
  moduleFileExtensions,
  moduleNameMapper,
  preset,
  setupFilesAfterEnv,
  setupFiles,
  testPathIgnorePatterns,
  transform
} = jlabConfig;

module.exports = {
  moduleFileExtensions,
  moduleNameMapper,
  preset,
  setupFilesAfterEnv,
  setupFiles,
  testPathIgnorePatterns: [
    ...testPathIgnorePatterns,
    '/jupyterlab_pullrequests'
  ],
  transform,
  automock: false,
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/*.d.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['lcov', 'text'],
  reporters: ['default'],
  testRegex: 'src/tests/.*.spec.ts[x]?$',
  transformIgnorePatterns: [`/node_modules/(?!${esModules}).+`],
  setupFiles: ['<rootDir>/setupJest.js'],
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json'
    }
  }
};
