/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

// import type { Config } from 'jest'
import type { JestConfigWithTsJest } from 'ts-jest'

const config: JestConfigWithTsJest = {
  testEnvironment: 'node',
  clearMocks: true,
  collectCoverage: true,
  rootDir: 'src',
  // относительно корня rootDir
  coverageDirectory: '../.temp/coverage',
  coverageProvider: 'v8',
  coverageReporters: [
    // "json",
    // "text",
    'lcov',
    // "clover"
  ],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    }
  },
  moduleFileExtensions: ['js', 'ts'],
  moduleNameMapper: {
    '(.+)\\.js$': '$1'
  },
  preset: 'ts-jest',
  testMatch: [
    '**/?(*.)+(test).[tj]s'
  ],
  // coveragePathIgnorePatterns: [],
  // modulePathIgnorePatterns: [],
}

export default config
