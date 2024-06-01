import { join } from 'node:path'
import {
  type Modifier,
  errorCode,
  makeModifier,
  rwModify
} from './index.js'
import { isArray } from './std.js'

// NOTE ТЕСТ ПИШЕТ НА ДИСК. Этот файл не работает без закомментирования строк publicrw***
//      в jest.config.ts -> coveragePathIgnorePatterns | modulePathIgnorePatterns

// !!! Установите путь явно или используйте process.cwd() - неизвестно что выдаст jest.
const workDir = process.cwd()
const src = join(workDir, 'package.json')
const dest = join(workDir, '.temp', '__test_dir__', 'package.json')

test('rwModify(...)', () => {
  const replacer: Modifier = (v, _, __) => [true, true, (v as string).replace('dist/', '')]
  const result = rwModify({
    mode: 'over',
    exclude: [
      'scripts',
      'devDependencies',
      'private'
    ],
    sample: {
      version: '0.2.125-alpha',
      'devDependencies.typescript': makeModifier(true),
      keywords: makeModifier((value, _, __) => {
        if (isArray(value) && !value.includes('super_package')) return [true, true, ['super_package', ...value]]
        return [true, false, null]
      }),
      main: makeModifier(replacer),
      types: makeModifier(replacer),
      'exports.*.*': makeModifier(replacer),
      'your.custom.property': {
        date: new Date().toUTCString()
      }
    },
    space: 2
  }, src, dest)
  expect(result.errors.isFatalError).toBe(false)
})

test('rwModify(...) read error', () => {
  const result = rwModify({
    exclude: ['foo']
  }, '12e58304-d180-4e61-a6b8-db4e3182c2bd', '12e58304-d180-4e61-a6b8-db4e3182c2bd')
  expect(result.errors.isFatalError).toBe(true)
  expect(result.errors.hasErrorCode(errorCode.READ_ERROR)).toBe(true)
})
