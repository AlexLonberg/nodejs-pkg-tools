/* eslint-disable no-sequences */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Options, ValidValue } from './types.js'
import {
  errorCode,
  makeModifier,
  modify
} from './index.js'

// DOC jest expect https://jestjs.io/ru/docs/expect

const jsonData = {
  version: '0.1.0',
  name: 'Some',
  scripts: {
    test: 'jest',
    build: 'tsc --project tsconfig.dist.json'
  },
  main: './dist/index.js',
  types: './dist/index.d.ts',
  exports: {
    '.': {
      import: './dist/index.js',
      types: './dist/index.d.ts'
    },
    util: {
      import: './dist/util.js',
      types: './dist/util.d.ts'
    }
  },
  devDependencies: {
    '@types/node': '^18.6.3',
    typescript: '^4.7.4'
  },
  private: true
}

test('modify(...) basic', () => {
  const expected = {
    version: '0.1.1-abc',
    name: 'Some',
    main: './index.js',
    types: './index.d.ts',
    exports: {
      '.': { import: './index.js', types: './index.d.ts' },
      util: { import: './util.js', types: './util.d.ts' }
    },
    devDependencies: { '@types/node': '^18.6.3' },
    date: { year: 2022 }
  }

  const deletion = makeModifier(false)
  const keeper = makeModifier(true)
  const replacer = makeModifier((v, _, __) => [true, true, (v as string).replace('dist/', '')])

  // 1 Обычное использование.
  const opts1: Options = {
    json: JSON.stringify(jsonData),
    mode: 'over_error',
    exclude: ['scripts', 'devDependencies'],
    sample: {
      version: '0.1.1-abc',
      date: { year: 2022 },
      private: deletion,
      'devDependencies.@types/node': keeper,
      main: replacer,
      types: replacer,
      'exports.*.*': replacer
    }
  }
  const result1 = modify(opts1)
  expect(result1.toValue()).toEqual(expected)

  // 2 Заменяем объект на массив для точного порядка вызова методов.
  const opts2: Options = {
    value: jsonData,
    // mode: 'strict', default
    include: ['name', 'devDependencies'],
    exclude: ['scripts', 'private', 'devDependencies.typescript'],
    sample: [
      ['version', '0.1.1-abc'],
      ['date.year', 2022],
      ['main', replacer],
      ['types', replacer],
      ['exports.*.*', replacer]
    ]
  }
  const result2 = modify(opts2)
  expect(result2.toValue()).toEqual(expected)

  // 3 Пути как массив, позволяют установить точки и звездочки ['.', '**'].
  const opts3: Options = {
    value: jsonData,
    mode: 'over',
    exclude: ['scripts', 'private', 'devDependencies'],
    sample: [
      [['version'], '0.1.1-abc'],
      [['date', 'year'], 2022],
      [['devDependencies', '@types/node'], keeper],
      [['main'], replacer],
      [['types'], replacer],
      [['exports', '*', '*'], replacer]
    ]
  }
  const result3 = modify(opts3)
  expect(result3.toValue()).toEqual(expected)
})

test('modify(...) invalid Root Node', () => {
  // Если пройтись по exports.* должно получится [".","util"].
  const acc1: string[] = []
  const push1 = (_: any, key: any, __: any) => (acc1.push(key as string), true)
  const opts1: Options = {
    value: jsonData,
    sample: [
      // Используем массивы для любых символов.
      [['exports', '.'], makeModifier(push1)],
      [['exports', 'util'], makeModifier(push1)]
    ]
  }
  void modify(opts1)
  expect(acc1).toEqual(['.', 'util'])

  // Пробуем сломать RNode
  const acc2: string[] = []
  const push2 = (_: any, key: any, __: any) => (acc2.push(key as string), true)
  const opts2: Options = {
    value: jsonData,
    sample: [
      [['exports', '.'], makeModifier(push2)],
      // Установка невалидного значения на Root или любое другое не имеет эффекта.
      // Результат в последнем запросе вернет тот же результат что и в примере выше.
      [[], Symbol() as unknown as ValidValue],
      [['scripts', 'test'], NaN as unknown as ValidValue],
      [['Invalid', 'path'], 123n as unknown as ValidValue],
      [['exports', 'util'], makeModifier(push2)]
    ]
  }
  const result2 = modify(opts2)
  expect(acc2).toEqual(['.', 'util'])

  // Должны быть ошибки установки свойства.
  expect(result2.errors.hasCode(errorCode.SET_INVALID_VALUE)).toBe(true)
})

test('modify(...) prepareValue join path', () => {
  // Проверка объединения пути в Helper.prepareValue() при добавлении нового свойства и ошибке.
  // Этот путь является информационным и не имеет отношения к обработке свойств.
  const opts1: Options = {
    value: jsonData,
    sample: {
      // Пробуем создать невалидное свойство в имеющемся пути.
      'devDependencies.typescript': makeModifier(() => [
        true, true,
        { foo: { bar: Symbol() as unknown as ValidValue } }
      ])
    }
  }
  const result1 = modify(opts1)
  const error = result1.errors.errors.find(({ code }) => code === errorCode.SET_INVALID_VALUE)
  expect(error?.path).toEqual(['devDependencies', 'typescript', 'foo', 'bar'])
})

test('modify(...) empty', () => {
  // Для пустых объектов/массивов результат фильтруется до корневого типа.
  let nodeRoot = modify({ value: [[[{}], {}], [[[{}]]]], include: [''], mode: 'over_error' })
  expect(nodeRoot.mode.isOver).toBe(true)
  expect(nodeRoot.toValue()).toEqual([])
  expect(nodeRoot.toJson()).toEqual('[]\n') // <- С форматированием добавляется перевод строки.
  nodeRoot = modify({ value: { foo: { bar: { box: [{}, {}] } } }, mode: 'over_error', space: 0 })
  expect(nodeRoot.toJson()).toEqual('{}') // <- space:0 без перевода строки.

  // Удаление единственного глубокого значения, так же приводит к пустому результату.
  nodeRoot = modify({
    value: { foo: { bar: { box: { fix: 132 } } } },
    exclude: ['foo.bar.box.fix'],
    mode: 'over'
  })
  expect(nodeRoot.toValue()).toEqual({})

  // Любое примитивное значение с удалением root, приведет к null.
  nodeRoot = modify({ value: 'qwerty', exclude: [''], mode: 'over' })
  expect(nodeRoot.toValue()).toEqual(null)

  // Невалидные значения игнорируются.
  nodeRoot = modify({
    value: { foo: { bar: 123 } },
    mode: 'over',
    sample: { 'foo.bar': 132n as unknown as null }
  })
  expect(nodeRoot.toValue()).toEqual({ foo: { bar: 123 } })
})

test('modify(...) errors', () => {
  // Фатальная ошибка
  let nodeRoot = modify({ json: ']' })
  expect(nodeRoot.errors.isFatalError).toBe(true)
  expect(nodeRoot.toJson()).toBe('')

  // Невалидное свойство
  nodeRoot = modify({ value: 132n as unknown as ValidValue, mode: 'error' })
  expect(nodeRoot.errors.isFatalError).toBe(true)
  expect(nodeRoot.toValue()).toBe(null)

  // Неверные пути с установкой фатальной ошибки
  nodeRoot = modify({ json: '{}', include: ['.....'], mode: 'error' })
  expect(nodeRoot.errors.isFatalError).toBe(true)
  nodeRoot = modify({ json: '{}', exclude: ['foo.**.bar'], mode: 'error' })
  expect(nodeRoot.errors.isFatalError).toBe(true)
  nodeRoot = modify({ json: '{}', sample: [['foo.**.bar', false]], mode: 'error' })
  expect(nodeRoot.errors.isFatalError).toBe(true)
  nodeRoot = modify({ json: '{}', sample: [['foo.bar', 123n as any]], mode: 'error' })
  expect(nodeRoot.errors.isFatalError).toBe(true)

  // С опцией 'error' пути для явного включения должны существовать.
  nodeRoot = modify({ json: '{}', include: ['foo'], mode: 'error' })
  expect(nodeRoot.errors.isFatalError).toBe(true)
  expect(nodeRoot.mode.isError).toBe(true)
  expect(nodeRoot.toJson()).toBe('')

  // Предупреждение изменения типа свойства.
  nodeRoot = modify({
    json: '{"box": 123}',
    sample: { 'box.update.path': '456' },
    mode: 'error'
  })
  expect(nodeRoot.errors.isFatalError).toBe(false)
  expect(nodeRoot.errors.hasWarningCode(errorCode.UPDATE_TYPE)).toBe(true)
  expect(nodeRoot.errors.hasCode(errorCode.UPDATE_TYPE)).toBe(true)
  const error = nodeRoot.errors.warnings.find(({ code }) => code === errorCode.UPDATE_TYPE)
  // Именно 'box' меняет тип, поэтому информация об ошибке без 'update.path'.
  expect(error?.path).toEqual(['box'])

  // Невалидный модификатор и исключение пользовательской функции.
  nodeRoot = modify({
    json: '{"box": 123, "fox": 456}',
    sample: {
      box: makeModifier(123n as unknown as boolean),
      // Заодно проверим throw.
      fox: makeModifier(() => { throw new Error('') })
    },
    mode: 'over'
  })
  expect(nodeRoot.errors.isFatalError).toBe(false)
  expect(nodeRoot.errors.hasErrorCode(errorCode.MODIFIER_INVALID)).toBe(true)
  expect(nodeRoot.errors.hasCode(errorCode.MODIFIER_RETURN)).toBe(true)

  // Невалидный тип return.
  nodeRoot = modify({
    value: { foo: { bar: { box: { fix: 132 } } } },
    sample: [
      // Удаляем -> сохраняем -> и пытаемся отправить null
      ['foo.bar.box', makeModifier((_, __, ___) => [false, false, null])],
      ['foo.bar.box.fix', makeModifier((_, __, ___) => [true, false, null])],
      ['foo.bar.box', makeModifier((_, __, ___) => null as any)],
      // А здесь будет ошибка отсутствия несуществующего пути для сохранения
      ['foo.bar.box.fox', makeModifier(true)]
    ],
    mode: 'over'
  })
  expect(nodeRoot.errors.hasCode(errorCode.MODIFIER_RETURN)).toBe(true)
  expect(nodeRoot.errors.hasCode(errorCode.FIND_PATH)).toBe(true)

  // Принудительный выход
  nodeRoot = modify({
    json: '{"box": 123}',
    sample: { box: makeModifier(() => false) },
    mode: 'over'
  })
  expect(nodeRoot.errors.isFatalError).toBe(true)
  expect(nodeRoot.errors.hasErrorCode(errorCode.ABORT)).toBe(true)

})

test('modify(...) over', () => {
  // Пример перезаписи свойства bar новым объектом.
  const origin = {
    foo: {
      bar: {
        box: 123,
        fox: 456
      }
    },
    intact: 'ok'
  }
  const result = modify({
    value: origin,
    mode: 'over',
    sample: {
      'foo.bar': { key: 789 }
    }
  })
  // !!! Свойство не мигрирует на bar, а полностью его заменяет.
  const expected = {
    foo: {
      bar: {
        key: 789
      }
    },
    intact: 'ok'
  }
  expect(result.toValue()).toEqual(expected)
})
