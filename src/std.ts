// # Standard

// ## aliases

type Primitive = undefined | boolean | number | string | bigint | symbol | null
type JsonPrimitive = null | boolean | number | string
type StructLike<TValue = unknown> = { [k: string | symbol]: TValue }
type AnyFunction = (...v: any[]) => (void | any)

// ## utils

type ValueOf<T> = T[keyof T]

// ## function

function isPrimitive (v: any): v is Primitive {
  return v === null ||
    typeof v === 'undefined' ||
    typeof v === 'boolean' ||
    typeof v === 'number' || // !NaN
    typeof v === 'string' ||
    typeof v === 'bigint' ||
    typeof v === 'symbol'
}

function isJsonPrimitive (v: any): v is JsonPrimitive {
  return v === null ||
    typeof v === 'boolean' ||
    typeof v === 'number' ||
    typeof v === 'string'
}

function isSymbol (v: any): v is symbol {
  return typeof v === 'symbol'
}

function isNullish (v: any): v is (undefined | null) {
  return typeof v === 'undefined' || v === null
}

function isBoolean (v: any): v is boolean {
  return typeof v === 'boolean'
}

function isNaN (v: any): v is number {
  return Number.isNaN(v)
}

function isNumber (v: any): v is number {
  return typeof v === 'number'
}

function isInteger (v: any): v is number {
  return typeof v === 'number' && Number.isInteger(v)
}

function isString (v: any): v is string {
  return typeof v === 'string'
}

function isArray<T extends any[]> (v: T | any): v is T {
  return Array.isArray(v)
}

function isObject<T extends object> (v: T | any): v is T {
  return (typeof v === 'object') && (v !== null)
}

function isStruct<T extends object> (v: T | any): v is T {
  return !Array.isArray(v) && isObject(v)
}

function isFunction<T extends ((...a: any[]) => any)> (v: T | any): v is T {
  return typeof v === 'function'
}

function hasOwn<T extends object, K extends (string | symbol)> (obj: T, key: K): obj is (T & { [_ in K]: K extends keyof T ? T[K] : unknown }) {
  return Object.hasOwn(obj, key)
}

export {
  type Primitive,
  type JsonPrimitive,
  type StructLike,
  type ValueOf,
  type AnyFunction,
  //
  isPrimitive,
  isJsonPrimitive,
  isSymbol,
  isNullish,
  isBoolean,
  isNaN,
  isNumber,
  isInteger,
  isString,
  isArray,
  isObject,
  isStruct,
  isFunction,
  hasOwn
}
