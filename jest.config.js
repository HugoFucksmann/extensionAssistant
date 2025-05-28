module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  // Ignorar archivos de node_modules
  transformIgnorePatterns: ['/node_modules/'],
  // Configuración para manejar módulos de VS Code
  moduleNameMapper: {
    'vscode': '<rootDir>/src/test/mocks/vscode.js'
  },
};
