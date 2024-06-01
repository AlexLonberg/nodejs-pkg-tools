import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync } from 'node:fs'
import { clearDir, copyDir } from './dist/dirs.js'
import { makeModifier } from './dist/marker.js'
import { rwModify } from './dist/publicrw.js'

// NOTE: Перед вызовом npm run build:npm должен быть вызван build для использования `from './dist/*'`
// После необходимо внести правки на ссылки
// ![](stage.png) - https://raw.githubusercontent.com/AlexLonberg/nodejs-pkg-tools/master/stage.png
// [src/errors.ts](src/errors.ts) - https://github.com/AlexLonberg/nodejs-pkg-tools/blob/master/src/errors.ts
// [файл 📄](src/types.ts) - https://github.com/AlexLonberg/nodejs-pkg-tools/blob/master/src/types.ts

const wd = dirname(fileURLToPath(import.meta.url))
const dest = join(wd, 'npm')

if (clearDir(dest) === false) throw new Error('Ошибка очистки каталога npm.')
mkdirSync(dest, { recursive: true })

const modifier = makeModifier((value) => [true, true,
  typeof value === 'string'
    ? value.replace('dist/', '')
    : (() => { throw new Error('Невалидное значение.') })()
])

if (rwModify({
  mode: 'strict_error',
  include: [
    'name',
    'version',
    'description',
    'author',
    'repository',
    'homepage',
    'keywords',
    'license',
    'engines',
    'type'
  ],
  sample: {
    main: modifier,
    types: modifier,
    'exports.*.*': modifier
  }
}, join(wd, 'package.json'), join(dest, 'package.json'))
  .errors.isFatalError) throw new Error('Ошибка записи package.json')

if (copyDir(wd, dest, ['LICENSE.md', 'README.md']) !== true) {
  throw new Error('Ошибка копирования файлов.')
}

console.log('\x1b[41m \x1b[37m ВНИМАНИЕ: В файл README.md надо внести правки адресов stage.png, src/errors.ts, src/types.ts \x1b[0m')
