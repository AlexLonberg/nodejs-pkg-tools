import {
  type Dirent,
  readdirSync,
  rmSync,
  mkdirSync,
  readlinkSync,
  symlinkSync,
  copyFileSync,
  statSync
} from 'node:fs'
import { join, resolve } from 'node:path'
import { isArray } from './std.js'

type Filter = (rel: string, type: 'dir' | 'file' | 'symlink' | null) => boolean

function createFilter (filter?: Filter | string[]): Filter {
  if (isArray(filter)) {
    const files = filter.map((v) => v.replace(/[\\\/]+/g, '/').replace(/^[\\\/]+|[\\\/]+$/g, ''))
    const folders: string[] = []
    for (const item of files) {
      const splitted = item.split('/')
      splitted.pop()
      while (splitted.length > 0) {
        folders.push(splitted.join('/'))
        splitted.pop()
      }
    }
    return (rel: string, type: 'dir' | 'file' | 'symlink' | null) => {
      if (type === 'dir') {
        return folders.includes(rel)
      }
      if (type === 'file') {
        return files.includes(rel)
      }
      return false
    }
  }
  return ((filter as unknown as Filter) || ((_, __) => true))
}

/**
 * Синхронная очистка каталога без удаления самого каталога.
 *
 * @param path Путь к каталогу.
 * @returns Возвратит:
 *            + `null`  - если вызов `readdirSync()` завершился ошибкой.
 *            + `true`  - если не произошло ошибок при удалении файлов.
 *            + `false` - если произошла хотя бы одна ошибка.
 */
function clearDir (path: string): null | boolean {
  let files: Dirent[]
  try {
    files = readdirSync(path, { encoding: 'utf8', withFileTypes: true })
  } catch (_) {
    return null
  }
  let noError = true
  for (const dirent of files) {
    try {
      if (dirent.isDirectory()) rmSync(join(path, dirent.name), { force: true, recursive: true })
      else rmSync(join(path, dirent.name), { force: true })
    } catch (_) {
      noError = false
    }
  }
  return noError
}

/**
 * Синхронное рекурсивное копирование файлов каталога.
 *
 * @param    src Каталог источников.
 * @param   dest Место назначения.
 * @param filter Необязательный фильтр может быть функцией или списком файлов.
 *               Функция принимает параметром путь относительно `src`
 *               и тип файла - `'dir' | 'file' | 'symlink' | null`.
 *               Фильтр должен вернуть: `true` - копируем и `false` - не копируем.
 *               Массив должен содержать только относительные пути к копируемым файлам,
 *               директории не допускаются, например: `['README.md', 'docs/help.md']`.
 *               Независимо от слеша OS `\/`, последние приводятся к правым `your/path`.
 * @returns Возвратит:
 *            + `null`  - если вызов `readdirSync()` завершился ошибкой.
 *            + `true`  - если не произошло ошибок при копировании файлов или каталог `src` пуст.
 *            + `false` - если произошла хотя бы одна ошибка.
 */
function copyDir (src: string, dest: string, filter?: Filter | string[]): null | boolean {

  const customFilter = createFilter(filter)

  const getDirent = (path: string): false | null | Dirent[] => {
    let files: Dirent[]
    try {
      files = readdirSync(path, { encoding: 'utf8', withFileTypes: true })
    } catch (_) {
      return false
    }
    return files.length ? files : null
  }

  const absSrc = resolve(src)
  const absDest = resolve(dest)
  let noError = true

  const recursive = (curr: string, ds: Dirent[]): void => {
    for (const item of ds) {
      const type = item.isSymbolicLink()
        ? 'symlink'
        : item.isFile()
          ? 'file'
          : item.isDirectory()
            ? 'dir'
            : null
      const rel = join(curr, item.name)
      if (!customFilter(rel.replace(/[\\\/]+/g, '/'), type)) continue

      const srcPath = join(absSrc, rel)

      if (type === 'dir') {
        const ds = getDirent(srcPath)
        if (ds) recursive(rel, ds)
        else if (ds === false) noError = false
        continue
      }

      try {
        mkdirSync(join(absDest, curr), { recursive: true })
      } catch (_) {
        noError = false
        continue
      }
      const destPath = join(absDest, rel)
      if (type === 'symlink') {
        try {
          const stats = statSync(srcPath)
          const link = readlinkSync(srcPath)
          symlinkSync(link, destPath, stats.isDirectory() ? 'dir' : 'file')
        } catch (_) {
          noError = false
        }
      } else {
        try {
          copyFileSync(srcPath, destPath)
        } catch (_) {
          noError = false
        }
      }
    }
  }

  const ds = getDirent(absSrc)
  if (ds) recursive('', ds)
  else if (ds === null) return true
  else return null
  return noError
}

export {
  type Filter,
  clearDir,
  copyDir
}
