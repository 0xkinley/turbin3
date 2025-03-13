module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    transform: {
      '^.+\\.tsx?$': 'ts-jest',
    },
    transformIgnorePatterns: [
      // This is crucial - transform node_modules for ESM modules
      'node_modules/(?!(chai|@solana|@coral-xyz|@project-serum|superstruct)/)',
    ],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    testTimeout: 60000, // Increase timeout for Solana tests
  };