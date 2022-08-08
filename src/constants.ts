import type { ValueOf } from './std.js'

/**
 * Коды ошибок.
 */
const errorCode = {
  /** 
   * Неопределенная ошибка. 
   */
  NONE: 0,
  /** 
   * Ошибка вызова функции `JSON.parse(...)`. 
   */
  JSON_PARSE: 1,
  /**
   * Ошибка при разборе пути `KeyPath` к свойствам.
   * Например 2 `".."` и более точек подряд считаются ошибкой, такой путь будет проигнорирован.
   */
  KEY_PATH: 2,
  /**
   * Типами значений могут быть только валидные для JSON значения: `null|boolean|number|string|[]|{}`.
   * Эта ошибка возникает для невалидных типов при разборе объекта(не JSON строки).
   */
  INVALID_VALUE: 3,
  /** 
   * То же что и INVALID_VALUE, но возникает в случае переопределения значения модификатором.
   */
  SET_INVALID_VALUE: 4,
  /**
   * Свойство указанное в пути не найдено.
   * Для опции exclude или модификатора удаления(`Sample:{path:<REMOVE>}`) эта ошибка не устанавливается, т.к. не считается ошибкой.
   */
  FIND_PATH: 5,
  /** 
   * Невалидный модификатор. `Sample:{path:<Modifier>}`. 
   */
  MODIFIER_INVALID: 6,
  /** 
   * Модификатор вернул недопустимое значение или вызов завершился ошибкой. 
   */
  MODIFIER_RETURN: 7,
  /** 
   * Ошибка обновления статуса хранения/удаления свойств.
   * Эта ошибка попадает в предупреждения и не является файтальной.
   * NOTE Скорее всего она никогда не произойдет ;)
   */
  UPDATE_STATUS: 8,
  /** 
   * Изменение типа значения свойства. 
   * Это работает только для переопределения различных базовых 
   * типов `Primitive` -> `[]|{}` или `[]` -> `{}` и наоборот.
   * Эта ошибка попадает в предупреждения и не является фатальной.
   */
  UPDATE_TYPE: 9,
  /** 
   * Обработка была прервана пользовательским модификатором. 
   */
  ABORT: 10,
  /** 
   * Ошибка чтения файла. Возможно файла не существует. 
   * Путь к файлу устанавливается первым и единственным элементом в ErrorInfo.path:[path].
   */
  READ_ERROR: 11,
  /** 
   * Ошибка записи файла. 
   */
  WRITE_ERROR: 12
} as const
Object.freeze(errorCode)
type TErrorCode = ValueOf<typeof errorCode>

/**
 * Типы свойств.
 */
const valueType = {
  NONE: /*     */ 0b00_0000_00,
  PRIMITIVE: /**/ 0b00_0000_01,
  NULL: /*     */ 0b00_0001_01,
  BOOLEAN: /*  */ 0b00_0010_01,
  NUMBER: /*   */ 0b00_0100_01,
  STRING: /*   */ 0b00_1000_01,
  CONTAINER: /**/ 0b00_0000_10,
  STRUCT: /*   */ 0b01_0000_10,
  LIST: /*     */ 0b10_0000_10
} as const
Object.freeze(valueType)
type TValueTypeNone = (typeof valueType.NONE)
type TValueTypePrimitives = (typeof valueType.NULL) | (typeof valueType.BOOLEAN) | (typeof valueType.NUMBER) | (typeof valueType.STRING)
type TValueTypeContainers = (typeof valueType.LIST) | (typeof valueType.STRUCT)
type TValueType = Exclude<ValueOf<typeof valueType>, TValueTypeNone | (typeof valueType.PRIMITIVE) | (typeof valueType.CONTAINER)>

/**
 * Режим обработки указывается в `Options.mode`.
 */
const editModeCode = {
  ERROR: /*        */ 0b00_1,
  STRICT: /*       */ 0b01_0, // default
  STRICT_ERROR: /* */ 0b01_1,
  OVER: /*         */ 0b10_0,
  OVER_ERROR:  /*  */ 0b10_1
} as const
Object.freeze(editModeCode)
type TEditModeCode = ValueOf<typeof editModeCode>

/**
 * Статус хранения/удаления свойств.
 * При обходе дерева элементы не удаляются, а устанавливают текущий статус.
 * В режиме STRICT все свойства принимают значение REMOVE, и наоборот в OVER режиме KEEP.
 */
const retentionStatus = {
  // Вспомогательные константы.
  _KEEP: /*        */ 0b01_0000,
  _REMOVE: /*      */ 0b10_0000,
  _SAMPLE: /*      */ 0b00_0001,
  _OPTION: /*      */ 0b00_0010,
  _DEF: /*         */ 0b00_0100,
  // *_SAMPLE - Перекрывают любой статус.
  KEEP_SAMPLE: /*  */ 0b01_0001,
  REMOVE_SAMPLE: /**/ 0b10_0001,
  // *_OPTION - Могут перекрыть только KEEP/REMOVE.
  KEEP_OPTION: /*  */ 0b01_0010,
  REMOVE_OPTION: /**/ 0b10_0010,
  // Эти режимы устанавливаются по умолчанию в зависимости от TEditModeCode.
  KEEP_DEF: /*     */ 0b01_0100,
  REMOVE_DEF: /*   */ 0b10_0100
} as const
Object.freeze(retentionStatus)
type TRetentionStatusLayer = (typeof retentionStatus._DEF) | (typeof retentionStatus._OPTION) | (typeof retentionStatus._SAMPLE)
type TRetentionStatus = Exclude<ValueOf<typeof retentionStatus>, TRetentionStatusLayer | (typeof retentionStatus._KEEP) | (typeof retentionStatus._REMOVE)>

/**
 * Применяется при определении типа Sample-модификатора.
 */
const modifierType = {
  VALUE: 1,
  BOOL: 2,
  FUN: 3
} as const
Object.freeze(modifierType)
type TModifierType = ValueOf<typeof modifierType>

/**
 * Стадия обработки.
 */
const editingStage = {
  NONE: 0,
  INIT: 1,
  INCLUDE: 2,
  EXCLUDE: 3,
  SAMPLE: 4
} as const
Object.freeze(editingStage)
type TEditingStage = ValueOf<typeof editingStage>

export {
  type TErrorCode,
  type TValueTypeNone,
  type TValueType,
  type TValueTypePrimitives,
  type TValueTypeContainers,
  type TEditModeCode,
  type TRetentionStatusLayer,
  type TRetentionStatus,
  type TModifierType,
  type TEditingStage,
  errorCode,
  valueType,
  editModeCode,
  retentionStatus,
  modifierType,
  editingStage
}
