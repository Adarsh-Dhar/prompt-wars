export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { 
      useESM: true,
      tsconfig: {
        module: 'esnext'
      }
    }],
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  testMatch: ['**/__tests__/**/*.test.{ts,js}', '**/?(*.)+(spec|test).{ts,js}'],
  extensionsToTreatAsEsm: ['.ts'],
  // Test timeout for integration tests
  testTimeout: 30000,
  // Handle ES modules
  transformIgnorePatterns: [
    'node_modules/(?!(fast-check|@solana|@coral-xyz))'
  ],
  // Allow async imports
  globals: {
    'ts-jest': {
      useESM: true
    }
  }
};