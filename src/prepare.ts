import type {
  PreparedSamplePath,
  PreparedOptions,
  PreparedValuePrimitive,
  PreparedValueContainer,
  PreparedValue,
  IHelper
} from './interfaces.js'
import {
  type TValueTypeNone,
  type TValueType,
  errorCode,
  valueType,
  editingStage
} from './constants.js'
import {
  type JsonPrimitive,
  type StructLike,
  isBoolean,
  isNaN,
  isNumber,
  isInteger,
  isString,
  isArray,
  isStruct,
  hasOwn
} from './std.js'
import type {
  ValidValue,
  KeyPath,
  ModifierMarker,
  SampleStruct,
  SampleRaw,
  Sample,
  Options
} from './types.js'
import { RNode } from './node.js'
import { PropPath } from './path.js'
import { getModifier } from './marker.js'

function jsonParse (json: string): [false, null] | [true, ValidValue] {
  try {
    const value = JSON.parse(json)
    return [true, value]
  } catch (_) {
    // console.log(_)
    return [false, null]
  }
}

function getValueType (value: unknown): TValueTypeNone | TValueType {
  if (value === null) return valueType.NULL
  if (isBoolean(value)) return valueType.BOOLEAN
  if (isNumber(value) && !isNaN(value)) return valueType.NUMBER
  if (isString(value)) return valueType.STRING
  if (isArray(value)) return valueType.LIST
  if (isStruct(value)) return valueType.STRUCT
  return valueType.NONE
}

/**
 * Подготавливает валидные значения объекта.
 * 
 * Эта функция проверяет круговые ссылки и устанавливает ошибку.
 * Пустые объекты и массивы не удаляются, т.к. контейнеры могут быть явно заданы пользователем для последующего обхода.
 * 
 * Первый уровень PreparedValue всегда будет содержать ключ `-1` -> `[-1, type, value]`,
 * который следует отбрасывать при построении дерева на целевом свойстве или RNode.
 * 
 * @param       rawValue Любое значение.
 * @param abortWithError Прервать операцию при любой ошибке.
 * @returns Кортеж:
 *            + [0] - Если были невалидные значения, тут будет массив путей относительно rawValue. Например примитив rawValue вернет пустой путь.
 *            + [1] - Результат валидных PreparedValue, которые можно передавать в конструктор Node, или null, если аргумент rawValue невалидный примитив.
 */
function prepareValue (rawValue: unknown, abortWithError: boolean): [null | (string | number)[][], null | PreparedValue] {
  const errors: (string | number)[][] = []
  const path: (string | number)[] = []
  const refs: unknown[] = []

  const recursive = (k: string | number, v: unknown): null | PreparedValue => {
    const type = getValueType(v)
    if (type === valueType.NONE) {
      errors.push(path.slice())
      return null
    }
    if (type & valueType.CONTAINER) {
      if (refs.includes(v)) {
        errors.push(path.slice())
        return null
      }
      refs.push(v)
    }
    let value: JsonPrimitive | ((PreparedValuePrimitive | PreparedValueContainer)[])
    if (type === valueType.LIST) {
      value = []
      for (let i = 0; i < (v as unknown[]).length; ++i) {
        path.push(i)
        const result = recursive(i, (v as unknown[])[i])
        path.pop()
        if (result) value.push(result)
        else if (abortWithError) return (refs.pop(), null)
      }
      refs.pop()
    } else if (type === valueType.STRUCT) {
      value = []
      for (const [key, rv] of Object.entries(v as StructLike)) {
        path.push(key)
        const result = recursive(key as string, rv)
        path.pop()
        if (result) value.push(result)
        else if (abortWithError) return (refs.pop(), null)
      }
      refs.pop()
    } else {
      value = v as JsonPrimitive
    }
    return [k, type, value] as PreparedValue
  }

  const result = recursive(-1, rawValue)
  return [errors.length ? errors : null, result]
}

const regExpTwoStarsErr = /\*{2,}/

/**
 * Разбирает стоку вида `"foo.*.bar.*"`.
 *
 * Примеры:
 *   + ""  - Пустая строка доступ к Root.
 *   + " " - Пробельные символы могут являться именем свойства.
 *   + "*" - Звездочка доступ ко всем элементам Root, если он []|{}.
 *
 * @param keyPath Строка используемая в Options[include/exclude] и имен свойств Options.sample.
 * @returns Кортеж:
 *           + true - Успех.
 *           + Путь в виде массива. Если ошибка, здесь будет оригинальный результат.
 */
function parseStringPath (keyPath: KeyPath): [boolean, string[]] {
  if (keyPath === '') return [true, []]
  const splitted = keyPath.split(/\./g)
  // Две точки ".." являются ошибкой, проверяем на пустую "" строку.
  const error = splitted.some((item: string) => (item === '' || regExpTwoStarsErr.test(item)))
  return [!error, splitted]
}

/**
 * Разбирает массивы include/exclude.
 * Первый элемент возвращаемого кортежа содержит ошибки путей.
 */
function prepareStringList (list: KeyPath[], abortWithError: boolean): [null | string[][], null | PropPath[]] {
  const errors: string[][] = []
  const pp: PropPath[] = []
  for (const item of list) {
    const [ok, path] = parseStringPath(item)
    if (ok) {
      pp.push(new PropPath(path))
    } else {
      errors.push(path)
      if (abortWithError) break
    }
  }
  return [errors.length ? errors : null, pp.length ? pp : null]
}

function parseSample (sample: Sample, abortWithError: boolean): [null | string[][], SampleRaw] {
  const errors: string[][] = []
  const result: SampleRaw = []
  const add = (rawPath: string, value: ValidValue | ModifierMarker): /* error */ boolean => {
    const [ok, path] = parseStringPath(rawPath)
    if (ok) {
      result.push([path, value])
      return false
    }
    errors.push(path)
    return abortWithError
  }
  if (isArray(sample)) {
    for (const [rawPath, value] of sample) {
      if (isArray(rawPath)) result.push([rawPath, value])
      else if /* string */ (add(rawPath, value)) break
    }
  } else /* isStruct(sample)) */ {
    for (const [rawPath, value] of Object.entries(sample as SampleStruct)) {
      if (add(rawPath, value)) break
    }
  }
  return [errors.length ? errors : null, result]
}

function prepareSample (rawSample: Sample, abortWithError: boolean): [
  null | string[][], // Ошибки пути.
  null | string[][], // Ошибки модификатора.
  null | PreparedSamplePath[]
] {
  const [ep, sample] = parseSample(rawSample, abortWithError)
  if (ep && abortWithError) return [ep, null, null]
  const errors: string[][] = []
  const tmp: PreparedSamplePath[] = []
  for (const [path, some] of sample) {
    const [ok, data] = getModifier(some)
    if (ok) {
      tmp.push([new PropPath(path), data])
    } else {
      errors.push(path)
      if (abortWithError) break
    }
  }
  return [ep, errors.length ? errors : null, tmp.length ? tmp : null]
}

function prepareOptions (helper: IHelper, options: Options): PreparedOptions {
  let ok = false
  let value: ValidValue = null

  // ## JSON | unknown

  if (hasOwn(options, 'json')) {
    [ok, value] = jsonParse(options.json)
    if (!ok) {
      helper.addError(errorCode.JSON_PARSE, [])
      helper.setFatalError()
      return { isFatalError: true }
    }
  } else {
    value = options.value
  }

  helper.stage.change(editingStage.INIT)

  // ## create Node

  // Ошибка пишется в IHelper, но может быть не установлен isFatalError, если !Options.mode:"error".
  const pv = helper.prepareValue([], value)
  if (!pv) helper.setFatalError()
  if (helper.isFatalError) return { isFatalError: true }
  const node = new RNode(helper, (helper.mode.isStrict ? helper.RSCreator.RemoveDef() : helper.RSCreator.KeepDef()), pv as PreparedValue)

  // ## include/exclude

  const [eip, include] = options.include ? prepareStringList(options.include, helper.mode.isStrict) : [null, null]
  if (eip) eip.forEach((p) => helper.addError(errorCode.KEY_PATH, p))
  if (helper.isFatalError) return { isFatalError: true }
  const [eep, exclude] = options.exclude ? prepareStringList(options.exclude, helper.mode.isStrict) : [null, null]
  if (eep) eep.forEach((p) => helper.addError(errorCode.KEY_PATH, p))
  if (helper.isFatalError) return { isFatalError: true }

  // ## sample

  const [ep, em, sample] = options.sample ? prepareSample(options.sample, helper.mode.isStrict) : [null, null, null]
  if (ep) ep.forEach((p) => helper.addError(errorCode.KEY_PATH, p))
  if (em) em.forEach((p) => helper.addError(errorCode.MODIFIER_INVALID, p))
  if (helper.isFatalError) return { isFatalError: true }

  return {
    isFatalError: false,
    node,
    include,
    exclude,
    sample,
    space: isInteger(options.space) && options.space >= 0 ? options.space : 2
  }
}

export {
  // tests
  jsonParse,
  parseStringPath,
  prepareStringList,
  prepareSample,
  // 
  prepareValue,
  prepareOptions
}
