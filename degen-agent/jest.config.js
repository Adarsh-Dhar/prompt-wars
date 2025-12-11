module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { 
      useESM: true,
      tsconfig: {
        module: 'esnext'
      }
    }],
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  extensionsToTreatAsEsm: ['.ts'],
  // Test timeout for integration tests
  testTimeout: 30000,
  // Handle ES modules
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@solana|@coral-xyz))'
  ],
  // Allow async imports
  globals: {
    'ts-jest': {
      useESM: true
    }
  }
}