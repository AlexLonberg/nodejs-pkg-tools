import {
  type TRetentionStatusLayer,
  type TRetentionStatus,
  retentionStatus as rs
} from './constants.js'

/**
 * Статус сохранения Node.
 */
class RetentionStatus {

  static KeepDef (): RetentionStatus { return new RetentionStatus(rs.KEEP_DEF) }
  static RemoveDef (): RetentionStatus { return new RetentionStatus(rs.REMOVE_DEF) }
  static KeepOption (): RetentionStatus { return new RetentionStatus(rs.KEEP_OPTION) }
  static RemoveOption (): RetentionStatus { return new RetentionStatus(rs.REMOVE_OPTION) }
  static KeepSample (): RetentionStatus { return new RetentionStatus(rs.KEEP_SAMPLE) }
  static RemoveSample (): RetentionStatus { return new RetentionStatus(rs.REMOVE_SAMPLE) }

  #value: TRetentionStatus

  constructor(rawValue: TRetentionStatus) {
    this.#value = rawValue
  }

  get isKeep (): boolean {
    return !!(this.#value & rs._KEEP)
  }

  #getValueType (v: TRetentionStatus): TRetentionStatusLayer {
    return (v & rs._SAMPLE)
      ? rs._SAMPLE
      : (v & rs._OPTION)
        ? rs._OPTION
        : rs._DEF
  }

  getType (): TRetentionStatusLayer {
    return this.#getValueType(this.#value)
  }

  /**
   * Приоритет 2-х объектов:
   *   +  0 - равны
   *   + -1 - текущий объект слабее
   *   + +1 - текущий объект сильнее
   */
  advantage (targetStatus: RetentionStatus): -1 | 0 | 1 {
    const selfType = this.#getValueType(this.#value)
    const targetType = this.#getValueType(targetStatus.#value)
    if (selfType === targetType) return 0
    if (selfType === rs._SAMPLE) return 1
    if (targetType === rs._SAMPLE) return -1
    if (selfType === rs._OPTION) return 1
    // Дальше у selfType может быть только _DEF, а так как типы не равны,
    // значит у targetType остается последний варирант _OPTION
    // !!! if (targetType === retentionStatus._OPTION) => TRUE
    return -1
  }

  /**
   * Обновление статуса.
   *
   * @param targetStatus
   * @returns Статус может быть обновлен, только при условии что аргумент
   *          обладает не меньшим преимуществом чем текущий RetentionStatus.
   */
  tryUpdate (targetStatus: RetentionStatus): boolean {
    if (this.advantage(targetStatus) === 1) return false
    this.#value = targetStatus.#value
    return true
  }

  clone (): RetentionStatus {
    return new RetentionStatus(this.#value)
  }
}

export {
  RetentionStatus
}
