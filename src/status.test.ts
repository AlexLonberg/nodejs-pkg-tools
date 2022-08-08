
import {
  RetentionStatus
} from './status.js'

const removeDef = RetentionStatus.RemoveDef()
const keepDef = RetentionStatus.KeepDef()
const keepOption = RetentionStatus.KeepOption()
const removeOption = RetentionStatus.RemoveOption()
const keepSample = RetentionStatus.KeepSample()
const removeSample = RetentionStatus.RemoveSample()

test('RetentionStatus() basic', () => {
  expect(removeDef.getType()).toBe(keepDef.getType())
  expect(removeDef.advantage(keepDef)).toBe(0)
  expect(removeDef.isKeep).toBe(false)
  expect(keepDef.isKeep).toBe(true)

  expect(keepOption.getType()).toBe(removeOption.getType())
  expect(keepSample.getType()).toBe(removeSample.getType())

  expect(keepOption.advantage(removeOption)).toBe(0)
  expect(keepOption.advantage(keepDef)).toBe(1)
  expect(keepOption.advantage(removeSample)).toBe(-1)
  expect(removeSample.advantage(keepOption)).toBe(1)

  expect(removeDef.getType()).not.toBe(removeOption.getType())
  expect(removeDef.getType()).not.toBe(keepSample.getType())
})

test('RetentionStatus() change of', () => {
  const clone = removeDef.clone()

  expect(clone.tryUpdate(removeOption)).toBe(true)
  expect(clone.tryUpdate(keepOption)).toBe(true)
  expect(clone.tryUpdate(removeSample)).toBe(true)
  expect(clone.tryUpdate(keepSample)).toBe(true)
  // Нельзя установить статус с меньшим прииоритетом
  expect(clone.tryUpdate(removeOption)).toBe(false)
  // Но можно изменить тип
  expect(clone.isKeep).toBe(true)
  expect(clone.tryUpdate(removeSample)).toBe(true)
  expect(clone.isKeep).toBe(false)
})
