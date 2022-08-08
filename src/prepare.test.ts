/* eslint-disable @typescript-eslint/no-explicit-any */
import { valueType } from './constants.js'
import {
  jsonParse,
  parseStringPath,
  prepareStringList,
  prepareValue,
  prepareSample
} from './prepare.js'
import {
  type Sample,
  makeModifier
} from './index.js'
import { PropPath } from './path.js'


test('jsonParse(...)', () => {
  let [ok, res] = jsonParse(' "" \n')
  expect(ok).toBe(true)
  expect(res).toBe('')
    ;[ok, res] = jsonParse(' ')
  expect(ok).toBe(false)
  expect(res).toBe(null)
    ;[ok, res] = jsonParse(' ]')
  expect(ok).toBe(false)
  expect(jsonParse('[1,2,3]')[1]).toEqual([1, 2, 3])
  expect(jsonParse('{"foo":"bar"}')[1]).toEqual({ foo: 'bar' })
})

test('parseStringPath(...)', () => {
  let res = parseStringPath('')
  expect(res).toEqual([true, []])
  res = parseStringPath('*')
  expect(res).toEqual([true, ['*']])
  res = parseStringPath('foo')
  expect(res).toEqual([true, ['foo']])
  res = parseStringPath('foo.bar')
  expect(res).toEqual([true, ['foo', 'bar']])
  res = parseStringPath('foo.*.bar')
  expect(res).toEqual([true, ['foo', '*', 'bar']])
  res = parseStringPath('foo.*.*.bar.*')
  expect(res).toEqual([true, ['foo', '*', '*', 'bar', '*']])
  //  .. | ** error
  res = parseStringPath('.foo..bar')
  expect(res).toEqual([false, ['', 'foo', '', 'bar']])
  res = parseStringPath('foo.bar.')
  expect(res).toEqual([false, ['foo', 'bar', '']])
  res = parseStringPath('**')
  expect(res).toEqual([false, ['**']])
  res = parseStringPath('foo.**.bar')
  expect(res).toEqual([false, ['foo', '**', 'bar']])
})

test('prepareStringList(...)', () => {
  const paths = ['box.**.fox', 'foo.bar']
  const parsed = prepareStringList(paths, false)
  expect(parsed[0]).toEqual([['box', '**', 'fox']]) // <- error
  expect(parsed[1]?.length).toBe(1)
  expect(prepareStringList(paths, /* break */ true)[1]).toBe(null)
})

test('prepareValue(...)', () => {
  // [ null, [ -1, 130, [ [Array], [Array], [Array], [Array] ] ] ]
  const rawValue = [1, '2', false, null]
  const prepared = prepareValue(rawValue, false)
  expect(prepared).toEqual([null, /* <- error */[
    -1,
    valueType.LIST,
    [
      [0, valueType.NUMBER, 1],
      [1, valueType.STRING, '2'],
      [2, valueType.BOOLEAN, false],
      [3, valueType.NULL, null]
    ]
  ]])

  rawValue[1] = Symbol() as unknown as string
  rawValue[3] = Symbol() as unknown as string
  const withInvalid = prepareValue(rawValue, false)
  expect(withInvalid[0]).toEqual([[1], [3]] /* <- error */)
  expect(withInvalid[1]).toEqual([
    -1,
    valueType.LIST,
    [
      [0, valueType.NUMBER, 1],
      // Symbol() <- error
      [2, valueType.BOOLEAN, false]
      // Symbol() <- error
    ]
  ])
  const withError = prepareValue(rawValue, true)
  expect(withError).toEqual([[[1]], null])

  const obj = prepareValue({ foo: { bar: [null] } }, true)
  expect(obj).toEqual([null, [
    -1, valueType.STRUCT,
    [
      [
        'foo', valueType.STRUCT,
        [
          ['bar', valueType.LIST, [[0, valueType.NULL, null]]]
        ]
      ]
    ]
  ]])
})

test('prepareValue(...) circular error', () => {
  const A: any = { foo: { bar: null } }
  const B: any = { box: { fix: null } }
  A.foo.bar = B
  B.box.fix = A
  const [circularA, _] = prepareValue(A, false)
  expect(circularA?.[0]).toEqual(['foo', 'bar', 'box', 'fix'])
  const [circularA2, ___] = prepareValue(A, true) // <- true
  expect(circularA2?.[0]).toEqual(['foo', 'bar', 'box', 'fix'])

  const C: any = [1, 2, 3, 4]
  const D: any = [1, 2, 3, 4]
  C[1] = D
  D[2] = C

  const [circularC, __] = prepareValue(C, false)
  expect(circularC?.[0]).toEqual([1, 2])
})

test('prepareSample(...)', () => {
  const me = makeModifier(Symbol() as unknown as boolean)
  expect(me).toHaveProperty('error')

  const rawSample: Sample = {
    'foo.bar': makeModifier((_, __, ___) => true),
    'storage.path': makeModifier(123n as unknown as boolean),
    'error.**.path': null
  }

  const [errorPaths, errorMod, result] = prepareSample(rawSample, false)
  expect(errorPaths?.[0]).toEqual(['error', '**', 'path'])
  expect(errorMod?.[0]).toEqual(['storage', 'path'])
  const pp = result?.[0]?.[0]
  expect(pp).toBeInstanceOf(PropPath)
  expect(pp?.toStringArray()).toEqual(['foo', 'bar'])
})
