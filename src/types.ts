import type { JsonPrimitive } from './std.js'
import type { TErrorCode } from './constants.js'

// # Публичные типы.

type JsonStruct = {
  [k: string]: JsonPrimitive | JsonArray | JsonStruct
}
type JsonArray = Array<JsonPrimitive | JsonArray | JsonStruct>
/**
 * Допустимое JSON значение. Установка невалидных типов вызовет ошибку.
 */
type ValidValue = JsonPrimitive | JsonArray | JsonStruct

/**
 * Строка определяющая доступ к свойству.
 * 
 * Варианты:
 *   + `"foo.bar"`       - Путь к свойству `{foo: {bar: any}}`.
 *   + `"your.*.path.*"` - Доступ ко всем свойствам структуры или массива `your` и `path`.
 * 
 * Две точки или звездочки подряд `"foo..bar.**.box"` не допускаются и вызовут ошибку.
 */
type KeyPath = string

/**
 * Результатом функции модификатора `Modifier`. Может быть `boolean` или кортеж:
 *   + `[0]!` - Флаг сохранения/удаления. Если `false` свойство будет удалено, при этом остальные элементы игнорируются.
 *   + `[1]?` - Действие. При `true` обновляем значение из [2], иначе оставляем оригинал, [2] при этом игнорируется, как и в случае с первым элементом.
 *   + `[2]?` - Новое значение, только если [0]:true и [1]:true.
 * 
 * Если boolean:
 *   + `true`  - Игнорирует результат функции, свойство может быть удалено или сохранено в зависимости от текущих установок.
 *   + `false` - Прервать обработку и установить фатальную ошибку.
 */
type ModifierReturns = boolean | [boolean, boolean, ValidValue]

/**
 * Обработчик свойств:
 * 
 * @param value Значение свойства.
 * @param   key Текущий ключ или индекс. Это последний элемент `path[length-1]` или `null`.
 *              `null` будет установлен при запросе корневого элемента, например так `Sample:{'': ModifierMarker}`.
 * @param  path Путь от корня до текущего свойства. Индексы массивов сохраняются на этапе инициализации и не меняются.
 */
type Modifier = (value: ValidValue, key: null | string | number, path: (string | number)[]) => ModifierReturns

/**
 * Маркер обработчика свойства. Объект может быть получен результатом вызова `ModifierCreator`.
 * Значения свойств `Sample` не имеющих маркер воспринимаются как обычный тип JS.
 * Передача невалидного значения установит свойство `ModifierMarker.error:true`.
 */
type ModifierMarker = { readonly error: boolean }

/**
 * Создает обработчик свойств и возвращает маркер, который должен быть установлен на `Sample:{'': ModifierMarker}`.
 * Один обработчик может устанавливаться на несколько свойств.
 * 
 * Вариантом действия обработчика могут быть:
 *   + `true`     - Сохраняет свойство.
 *   + `false`    - Удаляет свойство.
 *   + `Modifier` - Зависит от результата функции.
 */
type ModifierCreator = (action: boolean | Modifier) => ModifierMarker

/**
 * Пути к требуемым свойствам целевого объекта и новые значения или модификатор.
 * 
 * Ключами `Sample` должны быть `KeyPath`.
 * Значением может быть `Modifier` или любое валидное значение заменяющее оригинал.
 */
type SampleStruct = {
  [k in KeyPath]: ValidValue | ModifierMarker
}
/** 
 * То же что и `SampleStruct`, но в виде массива записей. 
 */
type SampleList = [KeyPath, (ValidValue | ModifierMarker)][]
/** 
 * То же что и `SampleStruct`, но в виде массива,
 * где первым элементом является массив пути к свойству. 
 * Этот путь не разбирается и используется как есть.
 * Числовые ключи недопустимы `["foo", 123, "bar"]` -> !!! 123.
 */
type SampleRaw = [string[], (ValidValue | ModifierMarker)][]
/**
 * См. варианты для каждого типа.
 */
type Sample = SampleStruct | SampleList | SampleRaw

/**
 * Базовые опции для всех методов.
 */
type BaseOptions = {
  /**
   * Определяет пути и модификаторы свойств.
   * Эта опция применяется последней и имеет наивысшее преимущество.
   */
  sample?: Sample
  /**
   * Поля для явного включения.
   * Параметр `include` имеет меньшее преимущество перед `exclude` и обходится первым.
   * Если `exclude` перекрывает свойство `include`, последнее будет удалено.
   */
  include?: KeyPath[]
  /**
   * Поля для явного исключения. См. описание `include`.
   */
  exclude?: KeyPath[]
  /**
   * Режим обработки:
   *   + `'strict'(default)` - Всем свойствам целевого объекта устанавливается временный статус на удаление.
   *                           Явное включение возможно только используя `sample/include`.
   *   + `'over'`   - Все свойства целевого объекта сохраняются или переопределяются параметрами `sample/include/exclude`.
   *   + `'error'`  - Любая ошибка предотвращает дальнейший разбор. Можно не использовать этот параметр 
   *                  и проверить код ошибки после модификации JSON.
   * 
   * @description
   * Что является ошибкой:
   *   + Результат вызова `JSON.parse(...)`.
   *   + Невалидное значение, если в качестве цели передан объект(например с полем Symbol)
   *     или значение устанавливается через модификатор `Sample`.
   *   + Отсутствие поля в целевом объекте, указанное в `include`.
   *   + Отсутствие поля в целевом объекте, указанное в `Sample` модификатором `makeModifier(true | function)` -
   *     нельзя сохранить свойство или вызвать функцию не зная его значения.
   *   + Попытка переопределения/создания отсутствующих свойств, если оно задано как `"foo.*"` -
   *     неименованное свойство создать нельзя.
   * 
   * Что НЕ является ошибкой:
   *   + Отсутствие поля в целевом объекте, указанное в `exclude` - поле уже отсутствует, значит не ошибка.
   *   + Отсутствие поля в целевом объекте, указанное в `Sample` модификатором `makeModifier(false)`.
   *   + Переопределение(модификатором Sample) типа значения, например примитив массивом -
   *     предполагается что `Sample` имеет большее преимущество перед целевым объектом.
   *     Такое переопределение попадет в предупреждения и может быть проверено.
   * 
   * Может быть указан любым сочетанием, т.к. вычисляется регулярным выражением.
   */
  mode?: 'strict' /* default */ | 'over' | 'error' /* равносильно strict_error */ |
  'stricterror' | 'overerror' | 'strict_error' | 'over_error' | 'strictError' | 'overError' |
  'errorstrict' | 'errorover' | 'error_strict' | 'error_over' | 'errorStrict' | 'errorOver'
  /**
   * Это значение будет передано в `JSON.stringify(str, null, space)`.
   * По умолчанию `2`.
   */
  space?: number
}
type ValueOption = BaseOptions & {
  /**
   * Целевым объектом модификации может быть любой валидный тип JS.
   */
  value: ValidValue
}
type JsonOption = BaseOptions & {
  /**
   * Валидная JSON строка.
   */
  json: string
}
/**
 * Смотри соответствующие типы.
 */
type Options = ValueOption | JsonOption

/**
 * Сведения об установленном режиме `Options.mode`.
 */
interface IEditMode {
  /**
   * Если `Options.mode` содержит "error".
   */
  readonly isError: boolean
  /**
   * Если `Options.mode` содержит "strict" или не было установлено "over".
   */
  readonly isStrict: boolean
  /**
   * Если `Options.mode` содержит "over".
   */
  readonly isOver: boolean
}

/**
 * Объект ошибки.
 */
type ErrorInfo = {
  /**
   * Код ошибки.
   */
  code: TErrorCode
  /**
   * Путь к свойству вызвавшему ошибку.
   * Если свойство массив, путь будет содержать индекс элемента.
   * Когда ошибка была вызвана разбором JSON, `path` может быть пустым.
   */
  path: (string | number)[]
  /**
   * Сообщение.
   */
  message: string
}
/**
 * Предоставляет сведения об ошибках.
 */
interface IErrors {
  /**
   * Это свойство устанавливается в `true`, если:
   *   + Ошибка вызова функции `JSON.parse(...)`.
   *   + Была установлена опция `Options.mode:"**error"`,
   *     при которой модификация немедленно прекращается при ошибках.
   */
  readonly isFatalError: boolean
  /**
   * Список всех ошибок.
   * Внимание: возвращается ссылка на массив без копирования.
   */
  readonly errors: ErrorInfo[]
  /**
   * Список сообщений не являющихся ошибками, например при попытке удалении несуществующего
   * поля или переопределения примитивного значения массивом через модификатор.
   */
  readonly warnings: ErrorInfo[]
  /**
    * Проверить наличие ошибки по коду.
    * @param code Допустимый код `TErrorCode`.
    * @returns Возвратит как `errors`, так и `warnings`.
    *          Для конкретного типа ошибки используйте `hasErrorCode(...)`/`hasWarningCode(...)`.
    */
  hasCode (code: TErrorCode): boolean
  /**
    * Проверить наличие ошибки в `errors`.
    * См. `hasCode(...)`.
    */
  hasErrorCode (code: TErrorCode): boolean
  /**
   * Проверить наличие ошибки в `warnings`.
   * См. `hasCode(...)`.
   */
  hasWarningCode (code: TErrorCode): boolean
}

interface INodeRoot {
  readonly mode: IEditMode
  readonly errors: IErrors
  /**
   * Возвращает значение в виде примитива, массива или структуры JS.
   * Если в результате модификации возникла ошибка значением может быть `null`.
   */
  toValue (): ValidValue
  /**
   * Преобразование к JSON представлению.
   * При фатальной ошибке вернет пустую строку.
   */
  toJson (): string
}

export type {
  JsonStruct,
  JsonArray,
  ValidValue,
  KeyPath,
  ModifierReturns,
  Modifier,
  ModifierMarker,
  ModifierCreator,
  SampleStruct,
  SampleList,
  SampleRaw,
  Sample,
  BaseOptions,
  ValueOption,
  JsonOption,
  Options,
  IEditMode,
  ErrorInfo,
  IErrors,
  INodeRoot
}
