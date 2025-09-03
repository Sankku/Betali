/**
 * Jest Configuration for Betali Backend Tests
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test files patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'controllers/**/*.js',
    'services/**/*.js',
    'repositories/**/*.js',
    'middleware/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/coverage/**'
  ],
  
  // Test timeouts
  testTimeout: 15000,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Verbose output
  verbose: true,
  
  // Handle ES modules if needed
  transformIgnorePatterns: [
    'node_modules/(?!(axios)/)'
  ],
  
  // Global variables
  globals: {
    'process.env.NODE_ENV': 'test'
  },
  
  // Test runner options
  maxWorkers: 1, // Run tests sequentially to avoid database conflicts
  
  // Module path mapping (if needed)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  }
};