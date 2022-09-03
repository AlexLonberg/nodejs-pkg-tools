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
    'types.ts',
    'interfaces.ts',
    // Читай ниже.
    'publicrw.test.ts',
    'publicrw.ts',
    'dirs.test.ts',
    'dirs.ts'
  ],
  modulePathIgnorePatterns: [
    // По умолчанию эти файлы отключены. Тест пишет на диск.
    // Закомментируйте эти строки для включения в тест.
    'publicrw.test.ts',
    'publicrw.ts',
    'dirs.test.ts',
    'dirs.ts'
  ],
  roots: [
    'src/'
  ]
} as Config.InitialOptions
