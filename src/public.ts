import type { IEditMode, IErrors, IRootNode, Options } from './types.js'
import type { IRNode } from './interfaces.js'
import { editingStage } from './constants.js'
import { Errors } from './errors.js'
import { createEditMode, createEditStage, createHelper } from './helper.js'
import { prepareOptions } from './prepare.js'
import { changeProperties, changeRetentionStatus } from './change.js'

function nodeRootError (mode: IEditMode, e: IErrors): IRootNode {
  return {
    get mode (): IEditMode { return mode },
    get errors (): IErrors { return e },
    toValue () { return null },
    toJson () { return '' }
  }
}

function nodeRoot (mode: IEditMode, e: IErrors, node: IRNode, space: number): IRootNode {
  return {
    get mode (): IEditMode { return mode },
    get errors (): IErrors { return e },
    toValue () { return node.toValue() },
    toJson () {
      return space
        ? `${JSON.stringify(node.toValue(), null, space)}\n`
        : JSON.stringify(node.toValue())
    }
  }
}

/**
 * Модификация JSON строки или объекта.
 *
 * @param options В опциях должен быть указан один из вариантов `Options.json` или `Options.value`.
 * @returns Результат может содержать `IRootNode.errors.isFatalError:true`.
 *          Это зависит от установленного параметра `Options.mode` и невалидных данных.
 */
function modify (options: Options): IRootNode {

  const mode = createEditMode(options.mode || undefined)
  const editStage = createEditStage()
  const errors = new Errors(mode.isError)
  const helper = createHelper(mode, editStage, errors)
  const data = prepareOptions(helper, options)
  if (data.isFatalError) return nodeRootError(mode, errors)

  // ## include/exclude

  editStage.change(editingStage.INCLUDE)
  if (data.include) {
    changeRetentionStatus(helper, data.include, data.node, helper.RSCreator.KeepOption())
    if (helper.isFatalError) return nodeRootError(mode, errors)
  }
  editStage.change(editingStage.EXCLUDE)
  if (data.exclude) {
    changeRetentionStatus(helper, data.exclude, data.node, helper.RSCreator.RemoveOption())
    if (helper.isFatalError) return nodeRootError(mode, errors)
  }

  // ## Sample

  editStage.change(editingStage.SAMPLE)
  if (data.sample) {
    changeProperties(helper, data.sample, data.node)
    if (helper.isFatalError) return nodeRootError(mode, errors)
  }

  return nodeRoot(mode, errors, data.node, data.space)
}

export {
  nodeRootError,
  modify
}
