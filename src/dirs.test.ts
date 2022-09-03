import { join } from 'node:path'
import {
  mkdirSync,
  readdirSync,
  rmSync, writeFileSync, symlinkSync
} from 'node:fs'
import { isArray, isObject } from './std.js'
import {
  type Filter,
  clearDir,
  copyDir
} from './index.js'

// NOTE ТЕСТ ПИШЕТ НА ДИСК. Этот файл не работает без закомментирования строк dirs***
//      в jest.config.ts -> coveragePathIgnorePatterns | modulePathIgnorePatterns

// !!! Установите путь явно или используйте process.cwd() - неизвестно что выдаст jest.
const workDir = process.cwd()
const testDir = join(workDir, '__test_dir__')

const srcDirName = 'folder'
const destDirName = 'folder-dest'

const structDir = {
  'doc.txt': 'some text\n',
  src: {
    'index.js': '// Example\n\nconsole.log(123)\n'
  },
  'symlink-file': [`${srcDirName}/doc.txt`, 'file'],
  'symlink-dir': [`${srcDirName}/src`, 'dir'],
  'exclude.txt': 'foo bar'
}

// https://jestjs.io/docs/setup-teardown#order-of-execution
beforeAll(() => {
  mkdirSync(testDir, { recursive: true })
  rmSync(join(testDir, srcDirName), { force: true, recursive: true })
  rmSync(join(testDir, destDirName), { force: true, recursive: true })

  const create = (curr: string, some: object) => {
    const currDir = join(testDir, curr)
    mkdirSync(currDir, { recursive: true })
    for (const [name, v] of Object.entries(some)) {
      const currPath = join(currDir, name)
      if (isArray(v)) {
        const [sp, type] = v
        symlinkSync(join(testDir, sp), currPath, type)
      } else if (isObject(v)) {
        create(join(curr, name), v)
      } else {
        writeFileSync(currPath, v, 'utf8')
      }
    }
  }
  create(srcDirName, structDir)
})

function equals (s1: object, s2: object): boolean {
  const p1 = Object.entries(s1).sort(([n], [n2]) => n > n2 ? 1 : -1)
  const p2 = Object.entries(s2).sort(([n], [n2]) => n > n2 ? 1 : -1)

  if (p1.length !== p2.length) return false
  for (let i = 0; i < p1.length; ++i) {
    const [n1, v1] = p1[i]!
    const [n2, v2] = p2[i]!
    if (n1 !== n2) return false
    if (isObject(v1)) {
      return isObject(v2) ? equals(v1, v2) : false
    }
    if (v1 !== v2) {
      return false
    }
  }
  return true
}

function readToStruct (path: string, filter: (n: string) => boolean): object {
  const result: any = {}
  const ds = readdirSync(path, { encoding: 'utf8', withFileTypes: true })
  for (const item of ds) {
    if (!filter(item.name)) continue
    result[item.name] = item.isDirectory()
      ? readToStruct(join(path, item.name), filter)
      : item.isSymbolicLink()
        ? 'symlink'
        : 'file'
  }
  return result
}

test('copyDir', () => {
  const filter: Filter = (rel: string, type: 'dir' | 'file' | 'symlink' | null) => {
    if (!/exclude/i.test(rel)) return true
    if (type !== 'file') throw new Error('invalid file type')
    return false
  }
  const res = copyDir(join(testDir, srcDirName), join(testDir, destDirName), filter)
  expect(res).toBe(true)

  // compare
  const fl = (n: string) => !/exclude/i.test(n)
  const s1 = readToStruct(join(testDir, srcDirName), fl)
  const s2 = readToStruct(join(testDir, destDirName), fl)
  expect(equals(s1, s2)).toBe(true)
})

test('clearDir', () => {
  expect(clearDir(join(testDir, 'ad92bf2e-c8cf-4e6c-88be-60d0e7680138'))).toBe(null)
  const path = join(testDir, srcDirName)
  const res = clearDir(path)
  expect(res).toBe(true)
  expect(readdirSync(path).length).toBe(0)
})
