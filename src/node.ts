import type { ValidValue } from './types.js'
import type {
  PreparedValuePrimitive,
  PreparedValueContainer,
  PreparedValue,
  IHelper,
  INode,
  IRNode
} from './interfaces.js'
import type { PropPath, PropPathEndPoint } from './path.js'
import type { RetentionStatus } from './status.js'
import {
  type TValueType,
  errorCode,
  valueType
} from './constants.js'
import { JsonPrimitive } from './std.js'

class CNode implements INode {

  #helper: IHelper
  #status: RetentionStatus
  #parent: null | CNode        // null если root
  #key: null | string | number // null если root
  #type: TValueType
  #value: JsonPrimitive | CNode[]

  constructor(
    helper: IHelper,
    status: RetentionStatus,
    parent: null | CNode,
    [key, type, value]: PreparedValue
  ) {
    this.#helper = helper
    this.#status = status.clone()
    this.#parent = parent
    this.#key = key === -1 ? null : key
    this.#type = type
    if (this.isContainer) {
      this.#value = []
      for (const pv of value as (PreparedValuePrimitive | PreparedValueContainer)[]) {
        this.#value.push(new CNode(helper, status, this, pv))
      }
    } else {
      this.#value = value as JsonPrimitive
    }
  }

  get key (): null | string | number {
    return this.#key
  }
  get isContainer (): boolean {
    return !!(this.#type & valueType.CONTAINER)
  }
  get isStruct (): boolean {
    return this.#type === valueType.STRUCT
  }
  get isList (): boolean {
    return this.#type === valueType.LIST
  }

  #addKeyToPath (acc: (string | number)[]) {
    if (this.#parent) {
      acc.unshift(this.#key as (string | number))
      this.#parent.#addKeyToPath(acc)
    }
  }

  /**
   * Возвращает массив ключей от текущего свойства до root.
   */
  getPath (): (string | number)[] {
    if (!this.#parent) return []
    const acc = [this.#key as (string | number)]
    this.#parent.#addKeyToPath(acc)
    return acc
  }

  #tryUpdateStatusUp (s: RetentionStatus) {
    if (!this.#status.tryUpdate(s)) {
      // До этой ошибки не дойдет
      this.#helper.addWarning(errorCode.UPDATE_STATUS, this.getPath())
      return
    }
    if (this.#parent) this.#parent.#tryUpdateStatusUp(s)
  }

  #tryUpdateStatusDown (s: RetentionStatus): boolean {
    if (!this.#status.tryUpdate(s)) {
      // До этой ошибки не дойдет
      this.#helper.addWarning(errorCode.UPDATE_STATUS, this.getPath())
      return false
    }
    if (this.isContainer) {
      for (const node of this.#value as CNode[]) {
        node.#tryUpdateStatusDown(s)
      }
    }
    return true
  }

  /**
   * При сохранении свойства движемся во все стороны - вниз и вверх по дереву, при удалении только вниз.
   * Если status имеет больший приоритет, изменение будет приостановлено.
   */
  tryUpdateStatus (s: RetentionStatus): void {
    if (!this.#tryUpdateStatusDown(s)) return
    if (this.#status.isKeep && this.#parent) this.#parent.#tryUpdateStatusUp(s)
  }

  #findPropertyByKey (key: number | string): undefined | CNode {
    return this.isContainer
      ? (this.#value as CNode[]).find((n) => n.#key === key)
      : undefined
  }

  _findProperties (path: PropPath): null | CNode[] {
    const [first, rest] = path.firstSplit()
    // Если path пустой, значит возвращаем самого себя, иначе ищем путь.
    if (!first) return [this]
    // Для непустого ключа this должен быть []|{}.
    if (!this.isContainer) return null
    if (!first.isFirstAnyKey) {
      return this.#findPropertyByKey(
        first.toStringFirstKey()
      )?._findProperties(rest) || null
    }
    const acc: CNode[] = []
    for (const node of this.#value as CNode[]) {
      const nodes = node._findProperties(rest as PropPath)
      if (nodes) acc.push(...nodes)
    }
    return acc.length ? acc : null
  }

  forceCreateProperty (path: PropPathEndPoint, pv: PreparedValue): void {
    // Будет искать пока не обнулится path.length
    const [first, rest] = path.firstSplit()
    if (!first) {
      const s = this.#helper.RSCreator.KeepSample()
      this.tryUpdateStatus(s)
      const [_, t, v] = pv
      // this.#key <- Ключ уже создан
      this.#type = t
      if (this.isContainer) {
        this.#value = []
        for (const p of v as (PreparedValuePrimitive | PreparedValueContainer)[]) {
          this.#value.push(new CNode(this.#helper, s, this, p))
        }
      } else {
        this.#value = v as JsonPrimitive
      }
      return
    }
    const key = first.toStringFirstKey()
    // Раз есть ключ, значит self -> {}.
    if (!this.isStruct) {
      this.#helper.addWarning(errorCode.UPDATE_TYPE, this.getPath())
      this.#type = valueType.STRUCT
      this.#value = []
    }
    const nodes = this.#value as CNode[]
    for (const node of nodes) {
      if (node.#key === key) {
        return node.forceCreateProperty(rest as PropPathEndPoint, pv)
      }
    }
    // Независимо от типа создаем {}, это предотвратит повторный заход в `if (!this.isStruct)`.
    // Тип и значение будет изменено выше.
    const node = new CNode(this.#helper, this.#helper.RSCreator.KeepSample(), this, [key, valueType.STRUCT, []])
    nodes.push(node)
    return node.forceCreateProperty(rest as PropPathEndPoint, pv)
  }

  /**
   * Возвращает JS представление объекта.
   * 
   * @param all Если установлено true, возвратит объект независимо от статуса хранения.
   * @returns Tuple:
   *   + [0] - Флаг хранения keep:true/remove:false только для текущего узла. Вложенные узлы могут иметь другой флаг.
   *   + [1] - Значение.
   */
  _forceToValue (all: boolean): [boolean, ValidValue] {
    const isKeep = this.#status.isKeep
    if (!all && !isKeep) return [false, null]
    if (this.isStruct) {
      const acc: [string, ValidValue][] = []
      for (const item of this.#value as CNode[]) {
        const [isk, value] = item._forceToValue(all)
        if (isk) acc.push([item.#key as string, value])
      }
      return [!!(all || (acc.length && isKeep)), Object.fromEntries(acc)]
    }
    if (this.isList) {
      const acc: ValidValue[] = []
      for (const item of (this.#value as CNode[])) {
        const [isk, value] = item._forceToValue(all)
        if (isk) acc.push(value)
      }
      return [!!(all || (acc.length && isKeep)), acc]
    }
    return [(all || isKeep), this.#value as JsonPrimitive]
  }

  forceToValue (): ValidValue {
    const [_, value] = this._forceToValue(true)
    return value
  }
}

class RNode extends CNode implements IRNode {

  constructor(
    helper: IHelper,
    status: RetentionStatus,
    value: PreparedValue
  ) {
    super(helper, status, null, value)
  }

  findProperties (path: PropPath): null | CNode[] {
    return this._findProperties(path)
  }

  /**
   * Обязательно возвращаем тот же тип что установлен в RNode,
   * возможно все элементы пустые и надеяться на value не стоит.
   */
  toValue (): ValidValue {
    const [isk, value] = this._forceToValue(false)
    return isk
      ? value
      : this.isStruct
        ? {}
        : this.isList
          ? []
          : null
  }
}

export {
  RNode
}
