export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { 
      useESM: true
    }],
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  extensionsToTreatAsEsm: ['.ts'],
  testTimeout: 30000,
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))'
  ]
};