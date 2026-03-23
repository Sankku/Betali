/**
 * Jest config for unit tests only.
 * Uses setup.unit.js — no server required.
 */

module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/unit/**/*.test.js', '<rootDir>/tests/unit/**/*.spec.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.unit.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage/unit',
  coverageReporters: ['text', 'lcov'],
  collectCoverageFrom: [
    'controllers/**/*.js',
    'services/**/*.js',
    'repositories/**/*.js',
    'middleware/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**'
  ],
  testTimeout: 10000,
  clearMocks: true,
  verbose: true,
  maxWorkers: 2,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  }
};
