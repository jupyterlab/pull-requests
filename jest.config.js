const jestJupyterLab = require('@jupyterlab/testutils/lib/jest-config');

const jlabConfig = jestJupyterLab('@jupyterlab/pullrequests', __dirname);

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
  coverageDirectory,
  moduleFileExtensions,
  moduleNameMapper,
  preset,
  setupFilesAfterEnv,
  setupFiles,
  testPathIgnorePatterns,
  transform,
  automock: false,
  testRegex: 'src/tests/.*.spec.ts[x]?$',
  transformIgnorePatterns: ['/node_modules/(?!(@?jupyterlab.*|react-spinners)/)'],
  setupFiles: ['<rootDir>/setupJest.js'],
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json'
    }
  }
};