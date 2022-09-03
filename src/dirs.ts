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

type Filter = (rel: string, type: 'dir' | 'file' | 'symlink' | null) => boolean

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
 * @param filter Необязательный фильтр, принимающий параметром путь относительно `src`
 *               и тип файла - `'dir' | 'file' | 'symlink' | null`.
 *               Функция должна вернуть: `true` - копируем и `false` - не копируем.
 * @returns Возвратит:
 *            + `null`  - если вызов `readdirSync()` завершился ошибкой.
 *            + `true`  - если не произошло ошибок при копировании файлов или каталог `src` пуст.
 *            + `false` - если произошла хотя бы одна ошибка.
 */
function copyDir (src: string, dest: string, filter?: Filter): null | boolean {

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
  const fl = filter || ((_, __) => true)
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
      if (!fl(rel, type)) continue

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
