import jsEslint from '@eslint/js'
import tsEslint from 'typescript-eslint'
import stylistic from '@stylistic/eslint-plugin'
// import globals from 'globals'

const jsRueles = jsEslint.configs.recommended.rules
const tsRules = tsEslint.configs.stylisticTypeChecked
  .reduce((a, item) => ((item.rules ? (a = { ...a, ...item.rules }) : a), a), {})

// Пример конфигурации https://typescript-eslint.io/packages/typescript-eslint#advanced-usage
export default tsEslint.config(
  {
    name: 'nodejs-pkg-tools',
    files: [
      'src/**/*.{ts,js}',
      'eslint.config.js',
      'jest.config.ts'
    ],
    // ignores: [
    // 'src/<>'
    // ],
    languageOptions: {
      // NOTE В одних примерах ecmaVersion/sourceType здесь, в других в parserOptions - не знаю куда лучше положить
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tsEslint.parser,
      parserOptions: {
        project: [
          'tsconfig.json',
          'tsconfig.project.json'
        ]
      }
      // globals: {
      //   ...globals.node
      // }
    },
    // linterOptions: {},
    // processor: ,
    plugins: {
      '@typescript-eslint': tsEslint.plugin,
      '@stylistic': stylistic
    },
    // settings: {},
    rules: {
      ...jsRueles,
      ...tsRules,
      // Это правило `a === b` не установлено в jsEslint.configs.recommended и вероятно во всех плагинах.
      eqeqeq: [
        'error',
        'always'
      ],
      // Правила для JS путают сигнатуры типов(например функций) с реальными, их следует отключить
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        vars: 'all',
        varsIgnorePattern: '^_',
        args: 'all',
        argsIgnorePattern: '^_',
        caughtErrors: 'all',
        caughtErrorsIgnorePattern: '^_'
      }],
      // Не дает использовать type и предлагает явно interface
      '@typescript-eslint/consistent-type-definitions': 'off',
      // Требовать импорта типов как 'import {type Foo} from ...'
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports', fixStyle: 'inline-type-imports' }],
      // Требует Record<A, B> или наоборот, вместо {[k: A]: B}
      '@typescript-eslint/consistent-indexed-object-style': 'off',
      // Не дает использовать в условных выражениях if( || )
      '@typescript-eslint/prefer-nullish-coalescing': ['error', { ignoreConditionalTests: true }],
      // Не дает явно объявить тип параметра `once: boolean = false`, считая что это лишнее.
      '@typescript-eslint/no-inferrable-types': 'off',
      // Требует вместо for/i использовать for/of.
      '@typescript-eslint/prefer-for-of': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      'no-useless-escape': 'off',
      //
      // ## Стиль ##
      //
      '@stylistic/quotes': ['error', 'single', { avoidEscape: true }]
    }
  })
