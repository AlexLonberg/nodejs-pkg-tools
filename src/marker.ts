import type { ModifierMarker, Modifier } from './types.js'
import type { ModifierData } from './interfaces.js'
import { isBoolean, isStruct, isFunction } from './std.js'
import {
  type TModifierType,
  modifierType
} from './constants.js'

const marker = Symbol('Modifier')

type ModifierDataBool = { handler: boolean, type: typeof modifierType.BOOL }
type ModifierDataFun = { handler: Modifier, type: typeof modifierType.FUN }
type Marker = { [marker]: (ModifierDataBool | ModifierDataFun) & { error: false } }
type MarkerWithError = Marker | { [marker]: { handler: null, type: null, error: true } }

/**
 * Создает обработчик и возвращает маркер, устанавливаемый на свойства Sample:{'': ModifierMarker}.
 *
 * @param action Вариантами могут быть:
 *                 + true     - Сохраняет свойство.
 *                 + false    - Удаляет свойство.
 *                 + Modifier - Функция-обработчик.
 */
function makeModifier (action: boolean | Modifier): ModifierMarker {
  let error = false
  let handler: null | boolean | Modifier = action
  let type: null | TModifierType = null
  if (isBoolean(action)) {
    type = modifierType.BOOL
  } else if (isFunction(action)) {
    type = modifierType.FUN
  } else {
    error = true
    handler = null
    type = null
  }
  return Object.defineProperties({ get error () { return error } }, {
    [marker]: {
      value: Object.freeze({ handler, type, error })
    }
  })
}

/**
 * Возвращает функцию-модификатор или любое значение.
 *
 * @param value Значение свойства `Sample:{'': value}`.
 * @returns Кортеж:
 *            + [0] - Если `false` - невалидное значение `ModifierMarker`, все остальные параметры игнорируются.
 *            + [1] - `value/boolean/Modifier` - зависит от `type`.
 */
function getModifier (value: unknown): [false, null] | [true, ModifierData] {
  if (isStruct(value) && (marker in value)) {
    try {
      const { handler, type, error } = (value as MarkerWithError)[marker]
      return error
        ? [false, null]
        : [true, { handler, type } as (ModifierDataBool | ModifierDataFun)]
    } catch (_) {
      return [false, null]
    }
  }
  return [true, { handler: value, type: modifierType.VALUE }]
}

export {
  makeModifier,
  getModifier
}
