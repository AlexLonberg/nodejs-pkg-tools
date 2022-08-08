import type { Config } from '@jest/types'

// https://jestjs.io/ru/docs/configuration
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js'],
  // DOC Ошибка при импорте файлов с расширением *.js, которое требует TypeScript.
  // https://github.com/swc-project/jest/issues/64#issuecomment-1029753225
  // https://jestjs.io/ru/docs/configuration#modulenamemapper-objectstring-string--arraystring
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  coverageDirectory: './.coverage',
  collectCoverage: true,
  collectCoverageFrom: [
    "src/**/*.{js,ts}"
  ],
  coverageProvider: 'v8',
  coveragePathIgnorePatterns: [
    'publicrw.test.ts',
    'publicrw.ts',
    'types.ts',
    'interfaces.ts'
  ],
  modulePathIgnorePatterns: [
    'publicrw.test.ts',
    'publicrw.ts'
  ],
  roots: [
    'src/'
  ],

} as Config.InitialOptions
