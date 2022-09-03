import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync, copyFileSync } from 'node:fs'
import { clearDir } from './dist/dirs.js'
import { makeModifier } from './dist/marker.js'
import { rwModify } from './dist/publicrw.js'

// Перед вызовом npm run build:npm должен быть вызван build

const wd = dirname(fileURLToPath(import.meta.url))
const dest = join(wd, 'npm')

if (clearDir(dest) === false) throw new Error('Ошибка очистки каталога npm.')
mkdirSync(dest, { recursive: true })
copyFileSync(join(wd, 'LICENSE.md'), join(dest, 'LICENSE.md'))

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
