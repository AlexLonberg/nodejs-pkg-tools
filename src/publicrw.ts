import { cwd } from 'node:process'
import { isAbsolute, normalize, resolve, dirname } from 'node:path'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import type { BaseOptions, IRootNode, JsonOption, Options } from './types.js'
import { isNullish } from './std.js'
import {
  type TErrorCode,
  errorCode
} from './constants.js'
import { nodeRootError, modify } from './public.js'
import { Errors } from './errors.js'
import { createEditMode } from './helper.js'

function resolvePath (path?: null | string): string {
  return isNullish(path)
    ? cwd()
    : isAbsolute(path) ? normalize(path) : resolve(path)
}

function rootError (code: TErrorCode, path: string, mode?: null | string): IRootNode {
  const editMode = createEditMode(mode || undefined)
  const errors = new Errors(editMode.isError)
  errors._addError(code, [path])
  errors._setFatalError()
  return nodeRootError(editMode, errors)
}

/**
 * Читает/модифицирует/записывает JSON-файл.
 * Альтернативный вариант modify(...), позволяющий сразу писать файлы на диск.
 *
 * @param options Опции модификации.
 * @param     src Файл источник. Например "./package.json". По умолчанию рабочей директорией
 *                считается process.cwd(), и путь расчитывается как resolve(src).
 *                Или же укажите абсолютное расположение файла.
 *                Если этот параметр не установлен или `null`, источником может быть
 *                значение или JSON строка, как и в случае с функцией `modify()`.
 * @param    dest Место назначения. Например "dest/package.json".
 *                Если параметр не установлен, результат все равно войдет в возвращаемый объект.
 * @returns Результат может содержать `IRootNode.errors.isFatalError:true`.
 *          Это зависит от установленного параметра `Options.mode` и невалидных данных.
 */
function rwModify (options: BaseOptions | Options, src?: null | string, dest?: null | string): IRootNode {
  const opts = { ...options }
  if (!isNullish(src)) {
    const path = resolvePath(src)
    try {
      (opts as JsonOption).json = readFileSync(path, { encoding: 'utf8' })
    } catch (_) {
      return rootError(errorCode.READ_ERROR, path)
    }
  }
  const result = modify(opts as JsonOption)
  if (result.errors.isFatalError || isNullish(dest)) return result
  const destPath = resolvePath(dest)
  try {
    mkdirSync(dirname(destPath), { recursive: true })
    writeFileSync(destPath, result.toJson(), { encoding: 'utf8' })
  } catch (_) {
    // NOTE На самом деле это Errors.
    (result.errors as Errors)._addError(errorCode.WRITE_ERROR, [destPath])._setFatalError()
  }
  return result
}

export {
  resolvePath,
  rwModify
}
