import type { Modifier, ModifierReturns } from './types.js'
import type { IHelper, INode, IRNode, PreparedSamplePath } from './interfaces.js'
import type { RetentionStatus } from './status.js'
import { editingStage, errorCode, modifierType } from './constants.js'
import { isArray, isBoolean } from './std.js'
import {
  type PropPath,
  PropPathEndPoint
} from './path.js'

function changeRetentionStatus (helper: IHelper, list: PropPath[], nodeRoot: IRNode, s: RetentionStatus) {
  for (const path of list) {
    const nodes = nodeRoot.findProperties(path)
    if (nodes) {
      for (const node of nodes) {
        node.tryUpdateStatus(s)
      }
    } else if (helper.stage.code === editingStage.INCLUDE) {
      // Для Option.include пишем ошибку.
      helper.addError(errorCode.FIND_PATH, path.toStringArray())
    }
    if (helper.isFatalError) return
  }
}

function createProperty (helper: IHelper, node: INode, path: PropPathEndPoint, value: unknown) {
  // Ошибка типа пишется в helper.prepareValue().
  const pv = helper.prepareValue(node.getPath(), value)
  if (pv) node.forceCreateProperty(path, pv)
}

function changeProperty (helper: IHelper, node: INode, res: ModifierReturns) {
  if (isBoolean(res)) {
    if (res) return
    helper.addError(errorCode.ABORT, node.getPath())
    helper.setFatalError()
  } else if (isArray(res)) {
    const [keep, resValue, rawValue] = res
    if (!keep) {
      node.tryUpdateStatus(helper.RSCreator.RemoveSample())
    } else if (!resValue) {
      node.tryUpdateStatus(helper.RSCreator.KeepSample())
    } else {
      createProperty(helper, node, new PropPathEndPoint([]), rawValue)
    }
  } else {
    helper.addError(errorCode.MODIFIER_RETURN, node.getPath())
  }
}

function changeProperties (helper: IHelper, sample: PreparedSamplePath[], nodeRoot: IRNode) {
  for (const [path, { type, handler }] of sample) {
    const nodes = nodeRoot.findProperties(path)

    if (!nodes) {
      if (type === modifierType.VALUE) {
        const ep = path.tryEndPoint()
        if (ep) {
          createProperty(helper, nodeRoot, ep, handler)
          continue
        }
      } else if (type === modifierType.BOOL) {
        if (!(handler as boolean)) continue
      }
      // Функцию невозможно вызвать без аргументов - это всегда ошибка.
      // else if (type === modifierType.FUN) ... error
      helper.addError(errorCode.FIND_PATH, path.toStringArray())
      if (helper.isFatalError) return
      continue
    }

    for (const node of nodes) {
      if (type === modifierType.FUN) {
        const value = node.forceToValue()
        // Предотвращаем ошибку пользовательской функции.
        try {
          const res = (handler as Modifier)(value, node.key, node.getPath())
          changeProperty(helper, node, res)
        } catch (_) {
          helper.addError(errorCode.MODIFIER_RETURN, node.getPath())
        }
      } else if (type === modifierType.BOOL) {
        node.tryUpdateStatus(handler ? helper.RSCreator.KeepSample() : helper.RSCreator.RemoveSample())
      } else /* VALUE */ {
        createProperty(helper, node, new PropPathEndPoint([]), /* rawValue */ handler)
      }
      if (helper.isFatalError) return
    }
  }
}

export {
  changeRetentionStatus,
  changeProperties
}
