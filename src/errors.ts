import type { ErrorInfo, IErrors } from './types.js'
import {
  type TErrorCode,
  errorCode
} from './constants.js'

function createError (code: TErrorCode, path: (string | number)[]): ErrorInfo {
  switch (code) {
    case errorCode.JSON_PARSE:
      return {
        code,
        message: 'Ошибка разбора JSON.',
        path
      }
    case errorCode.KEY_PATH:
      return {
        code,
        message: 'Неверный формат пути.',
        path
      }
    case errorCode.INVALID_VALUE:
      return {
        code,
        message: 'Значением свойства должны быть валидные для JSON типы: null|boolean|number|string|[]|{}.',
        path
      }
    case errorCode.SET_INVALID_VALUE:
      return {
        code,
        message: 'Новое значение свойства должно быть валидным для JSON типом: null|boolean|number|string|[]|{}.',
        path
      }
    case errorCode.FIND_PATH:
      return {
        code,
        message: 'Целевой объект не имеет указанного пути.',
        path
      }
    case errorCode.MODIFIER_INVALID:
      return {
        code,
        message: 'Невалидный модификатор.',
        path
      }
    case errorCode.MODIFIER_RETURN:
      return {
        code,
        message: 'Модификатор вернул недопустимое значение или вызов завершился ошибкой.',
        path
      }
    case errorCode.UPDATE_STATUS: // Эта ошибка, вероятно, произойти не может.
      return {
        code,
        message: 'Ошибка обновления статуса хранения/удаления свойств.',
        path
      }
    case errorCode.UPDATE_TYPE:
      return {
        code,
        message: 'Изменение типа значения.',
        path
      }
    case errorCode.ABORT:
      return {
        code,
        message: 'Пользовательский модификатор прервал обработку.',
        path
      }
    case errorCode.READ_ERROR:
      return {
        code,
        message: 'Ошибка чтения файла. Возможно файла не существует.',
        path
      }
    case errorCode.WRITE_ERROR:
      return {
        code,
        message: 'Ошибка записи файла.',
        path
      }
    default:
      return {
        code,
        message: 'Неопределенная ошибка.',
        path
      }
  }
}

class Errors implements IErrors {

  #fatalError = false
  #errors: ErrorInfo[] = []
  #warn: ErrorInfo[] = []
  #modeError: boolean

  constructor(modeError: boolean) {
    this.#modeError = modeError
  }

  get isFatalError () {
    return this.#fatalError
  }
  get errors (): ErrorInfo[] {
    return this.#errors
  }
  get warnings (): ErrorInfo[] {
    return this.#warn
  }

  _setFatalError (): void {
    this.#fatalError = true
  }
  _addError (code: TErrorCode, path: (string | number)[]): this {
    this.#errors.push(createError(code, path))
    if (this.#modeError) this.#fatalError = true
    return this
  }
  _addWarning (code: TErrorCode, path: (string | number)[]): this {
    this.#warn.push(createError(code, path))
    return this
  }

  hasErrorCode (code: TErrorCode): boolean {
    return this.#errors.some(({ code: c }) => code === c)
  }
  hasWarningCode (code: TErrorCode): boolean {
    return this.#warn.some(({ code: c }) => code === c)
  }
  hasCode (code: TErrorCode): boolean {
    return this.hasErrorCode(code) || this.hasWarningCode(code)
  }
}

export {
  Errors
}
