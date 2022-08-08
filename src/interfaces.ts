import type { TErrorCode, TEditingStage, TValueTypePrimitives, TValueTypeContainers, TModifierType } from './constants.js'
import type { ValidValue, IEditMode, Modifier } from './types.js'
import type { RetentionStatus } from './status.js'
import type { PropPath, PropPathEndPoint } from './path.js'
import type { JsonPrimitive } from './std.js'

interface IEditStage {
  readonly code: TEditingStage
  change (code: TEditingStage): void
}

interface IRSCreator {
  KeepDef (): RetentionStatus
  RemoveDef (): RetentionStatus
  KeepOption (): RetentionStatus
  RemoveOption (): RetentionStatus
  KeepSample (): RetentionStatus
  RemoveSample (): RetentionStatus
}

type PreparedValuePrimitive = [number | string, TValueTypePrimitives, JsonPrimitive]
type PreparedValueContainer = [number | string, TValueTypeContainers, (PreparedValuePrimitive | PreparedValueContainer)[]]
type PreparedValue = PreparedValuePrimitive | PreparedValueContainer

interface INode {
  readonly key: null | string | number
  getPath (): (string | number)[]
  tryUpdateStatus (s: RetentionStatus): void
  forceCreateProperty (path: PropPathEndPoint, value: PreparedValue): void
  forceToValue (): ValidValue
}

interface IRNode extends INode {
  findProperties (path: PropPath): null | INode[]
  toValue (): ValidValue
}

type ModifierData = {
  handler: unknown | boolean | Modifier
  type: TModifierType
}

type PreparedSamplePath = [PropPath, ModifierData]

type PreparedOptions = { readonly isFatalError: true } | {
  readonly isFatalError: false
  readonly node: IRNode
  readonly include?: null | PropPath[]
  readonly exclude?: null | PropPath[]
  readonly sample?: null | PreparedSamplePath[]
  readonly space: number
}

interface IHelper {
  readonly isFatalError: boolean
  readonly mode: IEditMode
  readonly stage: IEditStage
  readonly RSCreator: IRSCreator
  addError (code: TErrorCode, path: (string | number)[]): void
  addWarning (code: TErrorCode, path: (string | number)[]): void
  setFatalError (): void
  /** Путь используется для ошибки. */
  prepareValue (path: (string | number)[], rawValue: unknown): null | PreparedValue
}

export type {
  INode,
  IRNode,
  ModifierData,
  PreparedSamplePath,
  PreparedOptions,
  IEditStage,
  PreparedValuePrimitive,
  PreparedValueContainer,
  PreparedValue,
  IHelper
}
