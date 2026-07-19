/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'json-summary'],
  testMatch: ['**/tests/**/*.test.ts'],
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './coverage',
        filename: 'report.html',
        expand: true,
      },
    ],
  ],
};
