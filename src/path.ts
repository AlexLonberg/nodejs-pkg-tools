/** В выражениях if(...) подменяет метод. */
type PropPathRedefined = Omit<PropPath, 'toStringFirstKey'> & { toStringFirstKey (): string }

class PropPath {

  #path: string[]

  constructor(path: string[]) {
    this.#path = path.slice()
  }

  get isFirstAnyKey (): boolean {
    return !!this.#path.length && this.#path[0] === '*'
  }

  get isEndPoint (): boolean {
    return !this.#path.some((v) => v === '*')
  }

  /**
   * Разделяет путь на первый элемент и остаток.
   * 
   * Если этот метод возвращает ненулевой кортеж, первый элемент `PropPath` будет
   * обязательно непустым, и точно возвратит ключ `toStringFirstKey():string`.
   */
  firstSplit (): [null, null] | [PropPathRedefined, PropPath] {
    return this.#path.length
      ? [
        new PropPath(this.#path.slice(0, 1)) as (PropPathRedefined),
        new PropPath(this.#path.slice(1))
      ]
      : [null, null]
  }

  toStringFirstKey (): null | string {
    return this.#path.length
      ? this.#path[0] as string
      : null
  }

  toStringArray (): string[] {
    return this.#path.slice()
  }

  tryEndPoint (): null | PropPathEndPoint {
    return this.isEndPoint ? new PropPathEndPoint(this.#path) : null
  }
}

/**
 * Этот класс является заглушкой PropPath. Цель его - явно предоставить конечный путь к свойству.
 *   + foo.*.bar   - PropPath
 *   + foo.box.bar - PropPathEndPoint гарантирует такой путь, что можно использовать при создании свойств без ошибок.
 */
class PropPathEndPoint extends PropPath {
  constructor(path: string[]) {
    super(path)
  }
  // ? Иначе TS воспринимает PropPathEndPoint === PropPath
  get _ (): boolean {
    return true
  }
}

export {
  PropPath,
  PropPathEndPoint
}
