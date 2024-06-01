import type { IEditMode } from './types.js'
import type { IEditStage, PreparedValue, IHelper } from './interfaces.js'
import {
  type TErrorCode,
  type TEditingStage,
  errorCode,
  editModeCode,
  editingStage
} from './constants.js'
import type { Errors } from './errors.js'
import { RetentionStatus } from './status.js'
import { prepareValue } from './prepare.js'

function createEditMode (mode = 'strict'): IEditMode {
  let value = /over/i.test(mode) ? editModeCode.OVER : editModeCode.STRICT
  if (/error/i.test(mode)) value |= editModeCode.ERROR
  return {
    get isError (): boolean {
      return !!(value & editModeCode.ERROR)
    },
    get isStrict (): boolean {
      return !!(value & editModeCode.STRICT)
    },
    get isOver (): boolean {
      return !!(value & editModeCode.OVER)
    }
  }
}

function createEditStage (): IEditStage {
  let code: TEditingStage = 0
  return {
    get code () {
      return code
    },
    change (sc: TEditingStage): void {
      if (sc > code) code = sc
    }
  }
}

function createHelper (mode: IEditMode, stage: IEditStage, errors: Errors): IHelper {
  return {
    get mode () {
      return mode
    },
    get stage () {
      return stage
    },
    get RSCreator () {
      return RetentionStatus
    },
    get isFatalError () {
      return errors.isFatalError
    },
    addError (code: TErrorCode, path: (string | number)[]) {
      errors._addError(code, path)
    },
    addWarning (code: TErrorCode, path: (string | number)[]) {
      errors._addWarning(code, path)
    },
    setFatalError () {
      errors._setFatalError()
    },
    /**
     * Разбор значения.
     * @param     path Путь используется для ошибки.
     * @param rawValue Любое значение.
     * @returns
     */
    prepareValue (path: (number | string)[], rawValue: unknown): null | PreparedValue {
      const [ep, value] = prepareValue(rawValue, mode.isError)
      if (ep) {
        ep.forEach((p) => errors._addError(
          (stage.code === editingStage.SAMPLE
            ? errorCode.SET_INVALID_VALUE
            : errorCode.INVALID_VALUE),
          [...path, ...p]))
      }
      return value
    }
  }
}

export {
  createEditMode,
  createEditStage,
  createHelper
}
