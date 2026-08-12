import { readdirSync, readFileSync } from 'node:fs'
import { extname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import {
  GAME_DECIMAL_BIGINT_MAX_DIGITS,
  GAME_DECIMAL_ENCODED_MAX_LENGTH,
  GAME_DECIMAL_EXPONENT_LIMIT,
  GAME_DECIMAL_MINIMUM_SCHEDULER_SECONDS,
  GAME_DECIMAL_ONE,
  GAME_DECIMAL_TEN,
  GAME_DECIMAL_ZERO,
  absGameDecimal,
  addGameDecimals,
  ceilGameDecimal,
  cloneGameDecimal,
  compareGameDecimals,
  decomposeGameDecimal,
  divideGameDecimals,
  equalGameDecimals,
  floorGameDecimal,
  gameDecimalFromBigInt,
  gameDecimalFromCanonicalString,
  gameDecimalFromNumber,
  gameDecimalToBigIntChecked,
  gameDecimalToCanonicalString,
  gameDecimalToNumberChecked,
  gameDecimalToSchedulerSeconds,
  integerGameDecimalFromCanonicalString,
  integerGameDecimalFromBigInt,
  integerGameDecimalFromNumber,
  isFiniteGameDecimal,
  isGameDecimal,
  isIntegerGameDecimal,
  isNonNegativeGameDecimal,
  isZeroGameDecimal,
  logGameDecimal,
  maxGameDecimal,
  minGameDecimal,
  multiplyGameDecimals,
  powGameDecimal,
  restoreGameDecimal,
  rootGameDecimal,
  subtractGameDecimals,
} from './gameDecimal'

const repositoryCodeExtensions = new Set([
  '.cjs',
  '.cts',
  '.js',
  '.jsx',
  '.mjs',
  '.mts',
  '.ts',
  '.tsx',
])
const excludedRepositoryDirectories = new Set([
  '.git',
  'coverage',
  'dist',
  'node_modules',
])
const decimalPropertyNames = new Set(['mantissa', 'exponent'])
const assignmentOperatorTokens = Array.from(
  {
    length: ts.SyntaxKind.LastAssignment - ts.SyntaxKind.FirstAssignment + 1,
  },
  (_, index) => ts.tokenToString(ts.SyntaxKind.FirstAssignment + index)!,
)

function stringLiteralText(node: ts.Node | undefined): string | undefined {
  return node !== undefined && ts.isStringLiteralLike(node)
    ? node.text
    : undefined
}

function isDependencySpecifier(value: string | undefined): boolean {
  return (
    value === 'break_infinity.js' ||
    value?.startsWith('break_infinity.js/') === true
  )
}

function unwrapExpression(node: ts.Expression): ts.Expression {
  let current = node
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isNonNullExpression(current)
  ) {
    current = current.expression
  }
  return current
}

function callPath(node: ts.Expression): string | undefined {
  if (ts.isIdentifier(node)) return node.text
  if (ts.isPropertyAccessExpression(node)) {
    const owner = callPath(node.expression)
    return owner === undefined ? undefined : `${owner}.${node.name.text}`
  }
  return undefined
}

function isGameDecimalExpression(
  node: ts.Expression | undefined,
  checker: ts.TypeChecker,
): boolean {
  if (node === undefined) return false
  const unwrapped = unwrapExpression(node)
  const inspect = (type: ts.Type): boolean => {
    if (
      type.aliasSymbol?.getName() === 'GameDecimal' ||
      type.getSymbol()?.getName() === 'GameDecimal'
    ) {
      return true
    }
    if (type.isUnionOrIntersection()) return type.types.some(inspect)
    return /(?:^|[<|&(\s])GameDecimal(?:$|[>,|&)\s])/u.test(
      checker.typeToString(type),
    )
  }
  return inspect(checker.getTypeAtLocation(unwrapped))
}

function containsGameDecimalMutationTarget(
  node: ts.Node,
  checker: ts.TypeChecker,
): boolean {
  if (
    ((ts.isPropertyAccessExpression(node) &&
      decimalPropertyNames.has(node.name.text)) ||
      ts.isElementAccessExpression(node)) &&
    isGameDecimalExpression(node.expression, checker)
  ) {
    return true
  }
  let found = false
  ts.forEachChild(node, (child) => {
    if (!found && containsGameDecimalMutationTarget(child, checker)) {
      found = true
    }
  })
  return found
}

function scanBoundarySource(
  path: string,
  sourceFile: ts.SourceFile,
  checker?: ts.TypeChecker,
): readonly string[] {
  const violations: string[] = []
  const recordDependency = (node: ts.Node): void => {
    const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line
    violations.push(`${path}:${line + 1}:dependency-import`)
  }
  const recordMutation = (node: ts.Node): void => {
    const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line
    violations.push(`${path}:${line + 1}:decimal-mutation`)
  }
  const visit = (node: ts.Node): void => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      isDependencySpecifier(stringLiteralText(node.moduleSpecifier))
    ) {
      recordDependency(node)
    }
    if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      isDependencySpecifier(
        stringLiteralText(node.moduleReference.expression),
      )
    ) {
      recordDependency(node)
    }
    if (ts.isCallExpression(node)) {
      const first = node.arguments[0]
      const dependencyCall =
        isDependencySpecifier(stringLiteralText(first)) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) &&
            node.expression.text === 'require'))
      if (dependencyCall) recordDependency(node)

      const pathName = callPath(node.expression)
      if (
        checker !== undefined &&
        isGameDecimalExpression(node.arguments[0], checker) &&
        (pathName === 'Object.assign' ||
          pathName === 'Object.defineProperties' ||
          pathName === 'Object.defineProperty' ||
          pathName === 'Reflect.defineProperty' ||
          pathName === 'Reflect.set')
      ) {
        recordMutation(node)
      }
    }
    if (
      checker !== undefined &&
      ts.isBinaryExpression(node) &&
      ts.isAssignmentOperator(node.operatorToken.kind) &&
      containsGameDecimalMutationTarget(node.left, checker)
    ) {
      recordMutation(node)
    }
    if (
      checker !== undefined &&
      (ts.isPrefixUnaryExpression(node) ||
        ts.isPostfixUnaryExpression(node)) &&
      (node.operator === ts.SyntaxKind.PlusPlusToken ||
        node.operator === ts.SyntaxKind.MinusMinusToken) &&
      containsGameDecimalMutationTarget(node.operand, checker)
    ) {
      recordMutation(node)
    }
    if (
      checker !== undefined &&
      ts.isDeleteExpression(node) &&
      containsGameDecimalMutationTarget(node.expression, checker)
    ) {
      recordMutation(node)
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return violations
}

function repositoryCodePaths(repositoryRoot: string): readonly string[] {
  const paths: string[] = []
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && excludedRepositoryDirectories.has(entry.name)) {
        continue
      }
      const path = resolve(directory, entry.name)
      if (entry.isDirectory()) visit(path)
      else if (repositoryCodeExtensions.has(extname(entry.name))) paths.push(path)
    }
  }
  visit(repositoryRoot)
  return paths
}

function repositoryBoundaryViolations(): readonly string[] {
  const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url))
  const adapterPath = resolve(repositoryRoot, 'src/math/gameDecimal.ts')
  const paths = repositoryCodePaths(repositoryRoot)
  const sources = new Map(
    paths.map((path) => [path, readFileSync(path, 'utf8')] as const),
  )
  const mutationCandidatePattern =
    /GameDecimal|gameDecimal|\b(?:mantissa|exponent)\b|Object\.(?:assign|definePropert)|Reflect\.(?:set|defineProperty)/u
  const mutationCandidates = paths.filter(
    (path) =>
      path !== adapterPath &&
      mutationCandidatePattern.test(sources.get(path) ?? ''),
  )
  const config = ts.readConfigFile(
    resolve(repositoryRoot, 'tsconfig.app.json'),
    ts.sys.readFile,
  )
  const parsed = ts.parseJsonConfigFileContent(
    config.config as object,
    ts.sys,
    repositoryRoot,
  )
  const program = ts.createProgram(mutationCandidates, {
    ...parsed.options,
    allowJs: true,
    checkJs: false,
    noEmit: true,
  })
  const checker = program.getTypeChecker()
  const violations: string[] = []
  for (const path of paths) {
    if (path === adapterPath) continue
    const checkedSourceFile = program.getSourceFile(path)
    const sourceFile =
      checkedSourceFile ??
      ts.createSourceFile(
        path,
        sources.get(path) ?? '',
        ts.ScriptTarget.Latest,
        true,
        path.endsWith('.tsx') || path.endsWith('.jsx')
          ? ts.ScriptKind.TSX
          : ts.ScriptKind.TS,
      )
    if (sourceFile !== undefined) {
      violations.push(
        ...scanBoundarySource(
          relative(repositoryRoot, path).replaceAll('\\', '/'),
          sourceFile,
          checkedSourceFile === undefined ? undefined : checker,
        ),
      )
    }
  }
  return violations
}

function syntheticBoundaryViolations(source: string): readonly string[] {
  const path = 'synthetic.ts'
  const sourceFile = ts.createSourceFile(
    path,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const options: ts.CompilerOptions = {
    noLib: true,
    noResolve: true,
    target: ts.ScriptTarget.Latest,
  }
  const baseHost = ts.createCompilerHost(options)
  const host: ts.CompilerHost = {
    ...baseHost,
    fileExists: (candidate) => candidate === path,
    getSourceFile: (candidate) =>
      candidate === path ? sourceFile : undefined,
    readFile: (candidate) => (candidate === path ? source : undefined),
  }
  const program = ts.createProgram([path], options, host)
  return scanBoundarySource(path, sourceFile, program.getTypeChecker())
}

describe('GameDecimal structural values', () => {
  it('enforces the dependency and structural mutation boundary', () => {
    expect(repositoryBoundaryViolations()).toEqual([])
  }, 30_000)

  it('recognizes every forbidden dependency form and package subpath', () => {
    const violations = syntheticBoundaryViolations(
      `
        import Decimal from 'break_infinity.js'
        export { default } from 'break_infinity.js/dist/private.js'
        import(\`break_infinity.js/internal\`)
        require(\`break_infinity.js\`)
        import DecimalCommon = require('break_infinity.js/dist/common.js')
        import 'break_infinity.js/escape'
      `,
    )

    expect(violations.filter((entry) =>
      entry.endsWith('dependency-import'),
    )).toHaveLength(6)
  })

  it('does not confuse control imports with the dependency', () => {
    expect(
      syntheticBoundaryViolations(`
        import Decimal from 'not-break_infinity.js'
        export { default } from './break_infinity.js'
        import(\`break_infinity.js/\${selected}\`)
        require('break_infinity.jsx')
        import Other = require('@scope/break_infinity.js')
      `),
    ).toEqual([])
  })

  it('recognizes every assignment operator and mutation API', () => {
    const assignments = assignmentOperatorTokens
      .map((operator) => `decimal.mantissa ${operator} 1`)
      .join('\n')
    const violations = syntheticBoundaryViolations(`
      type GameDecimal = { readonly mantissa: number; readonly exponent: number }
      declare let decimal: GameDecimal
      ${assignments}
      ++decimal.mantissa
      decimal['exponent']--
      delete decimal.mantissa
      Object.assign(decimal, { mantissa: 2 })
      Object.defineProperty(decimal, 'exponent', { value: 3 })
      Object.defineProperties(decimal, { mantissa: { value: 2 } })
      Reflect.defineProperty(decimal, 'mantissa', { value: 2 })
      Reflect.set(decimal, 'exponent', 3)
    `)

    expect(violations.filter((entry) =>
      entry.endsWith('decimal-mutation'),
    )).toHaveLength(assignmentOperatorTokens.length + 8)
  })

  it('does not flag same-named properties on non-GameDecimal types', () => {
    const assignments = assignmentOperatorTokens
      .map((operator) => `metrics.mantissa ${operator} 1`)
      .join('\n')
    expect(
      syntheticBoundaryViolations(`
        type Metrics = { mantissa: number; exponent: number }
        declare let metrics: Metrics
        ${assignments}
        ++metrics.exponent
        delete metrics.mantissa
        Object.assign(metrics, { mantissa: 2 })
        Object.defineProperty(metrics, 'exponent', { value: 3 })
        Object.defineProperties(metrics, { mantissa: { value: 2 } })
        Reflect.defineProperty(metrics, 'mantissa', { value: 2 })
        Reflect.set(metrics, 'exponent', 3)
        declare const key: keyof Metrics
        ;(metrics as any)[key] = 2
        ++(metrics as any)[key]
        delete (metrics as any)[key]
        Reflect.set(metrics as any, key, 3)
      `),
    ).toEqual([])
  })

  it('unwraps casts and forbids computed GameDecimal element mutation', () => {
    const violations = syntheticBoundaryViolations(`
      type GameDecimal = { readonly mantissa: number; readonly exponent: number }
      declare let decimal: GameDecimal
      declare const key: keyof GameDecimal
      ;(decimal as any).mantissa = 2
      ;(<any>decimal).exponent += 1
      ;(decimal satisfies GameDecimal)[key] = 3
      ++(decimal as unknown as any)[key]
      delete ((decimal as any)[key])
      Reflect.set((decimal as any), key, 4)
      Object.assign(((decimal as any)), { mantissa: 5 })
    `)

    expect(violations.filter((entry) =>
      entry.endsWith('decimal-mutation'),
    )).toHaveLength(7)
  })

  it('publishes immutable enumerable mantissa/exponent data only', () => {
    const value = gameDecimalFromNumber(123.5)

    expect(value).toEqual({ mantissa: 1.235, exponent: 2 })
    expect(Object.keys(value)).toEqual(['mantissa', 'exponent'])
    expect(Object.isFrozen(value)).toBe(true)
    expect(isGameDecimal(value)).toBe(true)
    expect(Object.getOwnPropertyDescriptor(value, 'mantissa')).toMatchObject({
      configurable: false,
      enumerable: true,
      writable: false,
    })
    expect(Object.getOwnPropertyDescriptor(value, 'exponent')).toMatchObject({
      configurable: false,
      enumerable: true,
      writable: false,
    })
    const brand = Object.getOwnPropertySymbols(value)
    expect(brand).toHaveLength(1)
    expect(Object.getOwnPropertyDescriptor(value, brand[0]!)).toEqual({
      configurable: false,
      enumerable: false,
      value: true,
      writable: false,
    })
  })

  it('rejects accessor-backed brand forgeries without invoking getters', () => {
    const brand = Object.getOwnPropertySymbols(GAME_DECIMAL_ONE)[0]!
    let getterCalls = 0
    const forgery = Object.defineProperties({}, {
      mantissa: {
        configurable: false,
        enumerable: true,
        get: () => {
          getterCalls += 1
          return 1
        },
      },
      exponent: {
        configurable: false,
        enumerable: true,
        get: () => {
          getterCalls += 1
          return 0
        },
      },
      [brand]: {
        configurable: false,
        enumerable: false,
        value: true,
        writable: false,
      },
    }) as typeof GAME_DECIMAL_ONE
    Object.freeze(forgery)

    expect(isGameDecimal(forgery)).toBe(false)
    expect(isFiniteGameDecimal(forgery)).toBe(false)
    expect(isNonNegativeGameDecimal(forgery)).toBe(false)

    const rejectedCalls: ReadonlyArray<() => unknown> = [
      () => restoreGameDecimal(forgery),
      () => cloneGameDecimal(forgery),
      () => isZeroGameDecimal(forgery),
      () => isIntegerGameDecimal(forgery),
      () => equalGameDecimals(forgery, GAME_DECIMAL_ONE),
      () => compareGameDecimals(forgery, GAME_DECIMAL_ONE),
      () => minGameDecimal(forgery, GAME_DECIMAL_ONE),
      () => maxGameDecimal(forgery, GAME_DECIMAL_ONE),
      () => absGameDecimal(forgery),
      () => addGameDecimals(forgery, GAME_DECIMAL_ONE),
      () => subtractGameDecimals(forgery, GAME_DECIMAL_ONE),
      () => multiplyGameDecimals(forgery, GAME_DECIMAL_ONE),
      () => divideGameDecimals(forgery, GAME_DECIMAL_ONE),
      () => powGameDecimal(forgery, 2),
      () => logGameDecimal(forgery, 10),
      () => rootGameDecimal(forgery, 2),
      () => floorGameDecimal(forgery),
      () => ceilGameDecimal(forgery),
      () => gameDecimalToCanonicalString(forgery),
      () => decomposeGameDecimal(forgery),
      () => gameDecimalToNumberChecked(forgery),
      () => gameDecimalToBigIntChecked(forgery),
      () => gameDecimalToSchedulerSeconds(forgery, 1),
    ]
    for (const call of rejectedCalls) {
      expect(call).toThrow(TypeError)
    }
    expect(getterCalls).toBe(0)
  })

  it('requires the exact frozen branded object shape', () => {
    const brand = Object.getOwnPropertySymbols(GAME_DECIMAL_ONE)[0]!
    const extraSymbol = Symbol('extra')
    const brandValue = (value: object, enumerable = false): object => {
      Object.defineProperty(value, brand, {
        configurable: false,
        enumerable,
        value: true,
        writable: false,
      })
      return Object.freeze(value)
    }

    const extraKey = brandValue({ mantissa: 1, exponent: 0, extra: true })
    const extraSymbolValue = { mantissa: 1, exponent: 0 }
    Object.defineProperty(extraSymbolValue, extraSymbol, { value: true })
    brandValue(extraSymbolValue)
    const enumerableBrand = brandValue({ mantissa: 1, exponent: 0 }, true)
    const nullPrototype = Object.assign(Object.create(null), {
      mantissa: 1,
      exponent: 0,
    })
    brandValue(nullPrototype)
    const customPrototype = Object.assign(Object.create({}), {
      mantissa: 1,
      exponent: 0,
    })
    brandValue(customPrototype)
    const inherited = Object.freeze(Object.create(GAME_DECIMAL_ONE))
    const notFrozen = { mantissa: 1, exponent: 0 }
    Object.defineProperty(notFrozen, brand, {
      enumerable: false,
      value: true,
    })

    for (const forgery of [
      extraKey,
      extraSymbolValue,
      enumerableBrand,
      nullPrototype,
      customPrototype,
      inherited,
      notFrozen,
    ]) {
      expect(isGameDecimal(forgery)).toBe(false)
    }
  })

  it('never caches externally validated structures or revoked proxies', () => {
    const brand = Object.getOwnPropertySymbols(GAME_DECIMAL_ONE)[0]!
    const external = { mantissa: 1, exponent: 0 }
    Object.defineProperty(external, brand, {
      configurable: false,
      enumerable: false,
      value: true,
      writable: false,
    })
    Object.freeze(external)
    const revocable = Proxy.revocable(external, {})
    expect(isGameDecimal(revocable.proxy)).toBe(true)
    revocable.revoke()
    expect(isGameDecimal(revocable.proxy)).toBe(false)

    const alreadyRevoked = Proxy.revocable({}, {})
    alreadyRevoked.revoke()
    expect(isGameDecimal(alreadyRevoked.proxy)).toBe(false)
  })

  it('rejects an accessor-backed brand without invoking it', () => {
    const brand = Object.getOwnPropertySymbols(GAME_DECIMAL_ONE)[0]!
    let getterCalls = 0
    const forgery = Object.defineProperty(
      { mantissa: 1, exponent: 0 },
      brand,
      {
        configurable: false,
        enumerable: false,
        get: () => {
          getterCalls += 1
          return true
        },
      },
    ) as typeof GAME_DECIMAL_ONE
    Object.freeze(forgery)

    expect(isGameDecimal(forgery)).toBe(false)
    expect(() => cloneGameDecimal(forgery)).toThrow(TypeError)
    expect(() => gameDecimalToCanonicalString(forgery)).toThrow(TypeError)
    expect(getterCalls).toBe(0)
  })

  it('rejects accessor-backed restoration input without invoking getters', () => {
    let getterCalls = 0
    const lookalike = Object.defineProperties({}, {
      mantissa: {
        enumerable: true,
        get: () => {
          getterCalls += 1
          return 1
        },
      },
      exponent: {
        enumerable: true,
        get: () => {
          getterCalls += 1
          return 0
        },
      },
    })

    expect(() => restoreGameDecimal(lookalike)).toThrow(TypeError)
    expect(getterCalls).toBe(0)
  })

  it('normalizes zero, including signed zero', () => {
    const negativeZero = gameDecimalFromNumber(-0)

    expect(negativeZero).toEqual({ mantissa: 0, exponent: 0 })
    expect(Object.is(negativeZero.mantissa, -0)).toBe(false)
    expect(isZeroGameDecimal(negativeZero)).toBe(true)
    expect(GAME_DECIMAL_ZERO).toEqual(negativeZero)
    expect(GAME_DECIMAL_ONE).toEqual({ mantissa: 1, exponent: 0 })
    expect(GAME_DECIMAL_TEN).toEqual({ mantissa: 1, exponent: 1 })
  })

  it('restores branding deliberately after structured cloning', () => {
    const original = gameDecimalFromCanonicalString('1.25e400')
    const nativeClone = structuredClone(original)

    expect(nativeClone).toEqual({ mantissa: 1.25, exponent: 400 })
    expect(isGameDecimal(nativeClone)).toBe(false)

    const restored = restoreGameDecimal(nativeClone)
    const cloned = cloneGameDecimal(restored)
    expect(isGameDecimal(restored)).toBe(true)
    expect(isGameDecimal(cloned)).toBe(true)
    expect(equalGameDecimals(restored, original)).toBe(true)
    expect(cloned).not.toBe(restored)
  })

  it('rejects hostile or non-normalized structural lookalikes', () => {
    expect(() =>
      restoreGameDecimal({ mantissa: Number.NaN, exponent: 0 }),
    ).toThrow(RangeError)
    expect(() =>
      restoreGameDecimal({ mantissa: 1, exponent: Number.NaN }),
    ).toThrow(RangeError)
    expect(() =>
      restoreGameDecimal({ mantissa: 1, exponent: 1.5 }),
    ).toThrow(RangeError)
    expect(() =>
      restoreGameDecimal({ mantissa: 1, exponent: -0 }),
    ).toThrow(RangeError)
    expect(() => restoreGameDecimal({ mantissa: 10, exponent: 2 })).toThrow(
      RangeError,
    )
    expect(() => restoreGameDecimal({ mantissa: -0, exponent: 0 })).toThrow(
      RangeError,
    )
    expect(() =>
      restoreGameDecimal({ mantissa: 1, exponent: 2, extra: true }),
    ).toThrow(TypeError)
    expect(() =>
      restoreGameDecimal(
        Object.create({ polluted: true }, {
          mantissa: { enumerable: true, value: 1 },
          exponent: { enumerable: true, value: 2 },
        }),
      ),
    ).toThrow(TypeError)
    expect(() =>
      restoreGameDecimal(
        Object.defineProperties({}, {
          mantissa: { enumerable: true, get: () => 1 },
          exponent: { enumerable: true, value: 2 },
        }),
      ),
    ).toThrow(TypeError)
    expect(() =>
      restoreGameDecimal(
        Object.defineProperties({}, {
          mantissa: { enumerable: false, value: 1 },
          exponent: { enumerable: true, value: 2 },
        }),
      ),
    ).toThrow(TypeError)
  })

  it('returns a frozen mantissa/exponent decomposition', () => {
    const parts = decomposeGameDecimal(
      gameDecimalFromCanonicalString('9.5e-20'),
    )
    expect(parts).toEqual({ mantissa: 9.5, exponent: -20 })
    expect(Object.isFrozen(parts)).toBe(true)
  })
})

describe('GameDecimal canonical parser and encoding', () => {
  it.each([
    '0',
    '1e0',
    '9.999999999999998e307',
    '1e308',
    '1e309',
    '1e-324',
    '1e8999999999999999',
    '1e-8999999999999999',
  ])('round-trips canonical input %s', (encoded) => {
    const value = gameDecimalFromCanonicalString(encoded)
    expect(gameDecimalToCanonicalString(value)).toBe(encoded)
    expect(
      equalGameDecimals(
        gameDecimalFromCanonicalString(
          gameDecimalToCanonicalString(value),
        ),
        value,
      ),
    ).toBe(true)
  })

  it('crosses the native-number limit without producing Infinity', () => {
    const nativeLimit = gameDecimalFromNumber(1e308)
    const beyondNative = multiplyGameDecimals(nativeLimit, GAME_DECIMAL_TEN)

    expect(gameDecimalToCanonicalString(nativeLimit)).toBe('1e308')
    expect(gameDecimalToCanonicalString(beyondNative)).toBe('1e309')
    expect(isFiniteGameDecimal(beyondNative)).toBe(true)
    expect(isNonNegativeGameDecimal(beyondNative)).toBe(true)
  })

  it.each([
    '',
    ' 1e0',
    '1e0 ',
    '+1e0',
    '-1e0',
    '-0',
    '0e0',
    '0.0e0',
    '01e0',
    '1.0e0',
    '1.e0',
    '.1e1',
    '1E0',
    '1e+0',
    '1e00',
    '1e-0',
    '1e01',
    '1,000e0',
    '1_000e0',
    '1e0junk',
    'NaN',
    'Infinity',
    'inf',
    '0x10',
  ])('rejects non-canonical or hostile input %j', (encoded) => {
    expect(() => gameDecimalFromCanonicalString(encoded)).toThrow()
  })

  it('enforces encoded length and the safe upstream exponent range', () => {
    expect(() =>
      gameDecimalFromCanonicalString(
        `1.${'1'.repeat(GAME_DECIMAL_ENCODED_MAX_LENGTH)}e0`,
      ),
    ).toThrow(RangeError)
    expect(() =>
      gameDecimalFromCanonicalString(
        `1e${GAME_DECIMAL_EXPONENT_LIMIT}`,
      ),
    ).toThrow(RangeError)
    expect(() =>
      gameDecimalFromCanonicalString(
        `1e-${GAME_DECIMAL_EXPONENT_LIMIT}`,
      ),
    ).toThrow(RangeError)
    expect(() =>
      gameDecimalFromCanonicalString('1e9007199254740991'),
    ).toThrow(RangeError)
  })

  it('lifts bounded bigint input without routing the whole value through number', () => {
    const source = BigInt(`1${'2'.repeat(100)}`)
    const value = gameDecimalFromBigInt(source)

    expect(value.exponent).toBe(100)
    expect(gameDecimalToCanonicalString(value)).toBe(
      '1.222222222222222e100',
    )
    expect(
      gameDecimalToCanonicalString(
        gameDecimalFromBigInt(BigInt('9'.repeat(100))),
      ),
    ).toBe('1e100')
    expect(
      gameDecimalToCanonicalString(
        gameDecimalFromBigInt(BigInt('9'.repeat(4_096))),
      ),
    ).toBe('1e4096')
    expect(() => gameDecimalFromBigInt(-1n)).toThrow(RangeError)
    expect(() =>
      gameDecimalFromBigInt('1' as unknown as bigint),
    ).toThrow(TypeError)
    expect(() =>
      integerGameDecimalFromBigInt(1 as unknown as bigint),
    ).toThrow(TypeError)
    expect(() =>
      gameDecimalFromBigInt(BigInt(`1${'0'.repeat(4_096)}`)),
    ).toThrow(RangeError)
    expect(GAME_DECIMAL_BIGINT_MAX_DIGITS).toBe(4_096)
  })
})

describe('GameDecimal arithmetic and exact comparisons', () => {
  it('supports arithmetic, powers, logarithms, and roots', () => {
    const twelve = gameDecimalFromNumber(12)
    const three = gameDecimalFromNumber(3)

    expect(gameDecimalToCanonicalString(addGameDecimals(twelve, three))).toBe(
      '1.5e1',
    )
    expect(
      gameDecimalToCanonicalString(subtractGameDecimals(twelve, three)),
    ).toBe('9e0')
    expect(
      gameDecimalToNumberChecked(multiplyGameDecimals(twelve, three)),
    ).toBe(36)
    expect(gameDecimalToNumberChecked(divideGameDecimals(twelve, three))).toBe(
      4,
    )
    expect(
      gameDecimalToCanonicalString(powGameDecimal(three, 4)),
    ).toBe('8.1e1')
    expect(
      gameDecimalToCanonicalString(
        powGameDecimal(GAME_DECIMAL_ONE, -1),
      ),
    ).toBe('1e0')
    expect(Object.is(powGameDecimal(GAME_DECIMAL_ONE, -1).exponent, -0)).toBe(
      false,
    )
    expect(
      gameDecimalToCanonicalString(
        logGameDecimal(gameDecimalFromNumber(1_000), 10),
      ),
    ).toBe('3e0')
    expect(
      gameDecimalToCanonicalString(
        rootGameDecimal(gameDecimalFromNumber(81), 2),
      ),
    ).toBe('9e0')
  })

  it('handles negligible operands according to represented precision', () => {
    const huge = gameDecimalFromCanonicalString('1e100')
    const sum = addGameDecimals(huge, GAME_DECIMAL_ONE)
    const difference = subtractGameDecimals(huge, GAME_DECIMAL_ONE)

    expect(equalGameDecimals(sum, huge)).toBe(true)
    expect(equalGameDecimals(difference, huge)).toBe(true)
  })

  it('renormalizes finite non-negative dependency results at a mantissa boundary', () => {
    const left = gameDecimalFromNumber(0.6000000000000001)
    const right = gameDecimalFromNumber(0.3999999999999986)
    const sum = addGameDecimals(left, right)

    expect(isGameDecimal(sum)).toBe(true)
    expect(Object.isFrozen(sum)).toBe(true)
    expect(sum.mantissa).toBeGreaterThanOrEqual(1)
    expect(sum.mantissa).toBeLessThan(10)
    expect(sum.exponent).toBe(-1)
    expect(gameDecimalToNumberChecked(sum)).toBeCloseTo(
      0.9999999999999987,
      15,
    )
  })

  it('copies upstream identity-return paths into fresh frozen values', () => {
    const huge = gameDecimalFromCanonicalString('1e100')
    const originalEncoding = gameDecimalToCanonicalString(huge)
    const results = [
      addGameDecimals(huge, GAME_DECIMAL_ZERO),
      addGameDecimals(GAME_DECIMAL_ZERO, huge),
      addGameDecimals(huge, GAME_DECIMAL_ONE),
      floorGameDecimal(huge),
      ceilGameDecimal(huge),
      minGameDecimal(huge, GAME_DECIMAL_ONE),
      maxGameDecimal(huge, GAME_DECIMAL_ONE),
    ]

    for (const result of results) {
      expect(isGameDecimal(result)).toBe(true)
      expect(Object.isFrozen(result)).toBe(true)
      expect(result).not.toBe(huge)
      expect(result).not.toBe(GAME_DECIMAL_ONE)
      expect(result).not.toBe(GAME_DECIMAL_ZERO)
    }
    expect(gameDecimalToCanonicalString(huge)).toBe(originalEncoding)
  })

  it('uses the verified power route for roots with negative exponents', () => {
    const result = rootGameDecimal(
      gameDecimalFromCanonicalString('1e-7'),
      3,
    )

    expect(result.exponent).toBe(-3)
    expect(result.mantissa).toBeCloseTo(4.641588833612782, 14)
  })

  it('uses normalized exact equality and ordering with no epsilon', () => {
    const exact = gameDecimalFromCanonicalString('1e20')
    const next = gameDecimalFromCanonicalString('1.0000000000000002e20')

    expect(equalGameDecimals(exact, cloneGameDecimal(exact))).toBe(true)
    expect(equalGameDecimals(exact, next)).toBe(false)
    expect(compareGameDecimals(exact, next)).toBe(-1)
    expect(compareGameDecimals(next, exact)).toBe(1)
    expect(compareGameDecimals(exact, cloneGameDecimal(exact))).toBe(0)
    expect(equalGameDecimals(minGameDecimal(exact, next), exact)).toBe(true)
    expect(equalGameDecimals(maxGameDecimal(exact, next), next)).toBe(true)
    expect(equalGameDecimals(absGameDecimal(exact), exact)).toBe(true)
  })

  it('rejects invalid economy results and operation domains', () => {
    expect(() =>
      powGameDecimal(
        GAME_DECIMAL_TEN,
        gameDecimalFromCanonicalString('1e-400') as unknown as number,
      ),
    ).toThrow(TypeError)
    expect(() =>
      powGameDecimal(
        GAME_DECIMAL_TEN,
        gameDecimalFromCanonicalString('1e400') as unknown as number,
      ),
    ).toThrow(TypeError)
    expect(() =>
      powGameDecimal(GAME_DECIMAL_TEN, Number.POSITIVE_INFINITY),
    ).toThrow(RangeError)
    expect(() => powGameDecimal(GAME_DECIMAL_ZERO, -1)).toThrow(RangeError)
    expect(() => powGameDecimal(GAME_DECIMAL_ZERO, 0)).toThrow(RangeError)
    expect(() =>
      subtractGameDecimals(GAME_DECIMAL_ONE, GAME_DECIMAL_TEN),
    ).toThrow(RangeError)
    expect(() =>
      divideGameDecimals(GAME_DECIMAL_ONE, GAME_DECIMAL_ZERO),
    ).toThrow(RangeError)
    expect(() => logGameDecimal(GAME_DECIMAL_ZERO, 10)).toThrow(RangeError)
    expect(() => logGameDecimal(GAME_DECIMAL_TEN, 1)).toThrow(RangeError)
    expect(() => rootGameDecimal(GAME_DECIMAL_TEN, 0)).toThrow(RangeError)
    expect(() => gameDecimalFromNumber(Number.POSITIVE_INFINITY)).toThrow(
      RangeError,
    )
    expect(() => gameDecimalFromNumber(-1)).toThrow(RangeError)
  })
})

describe('GameDecimal integer policy and checked conversions', () => {
  it('applies explicit quantity floor and currency-cost ceiling', () => {
    const fractional = gameDecimalFromCanonicalString('1.25e0')
    const floored = floorGameDecimal(fractional)
    const ceiled = ceilGameDecimal(fractional)

    expect(gameDecimalToCanonicalString(floored)).toBe('1e0')
    expect(gameDecimalToCanonicalString(ceiled)).toBe('2e0')
    expect(isIntegerGameDecimal(floored)).toBe(true)
    expect(isIntegerGameDecimal(ceiled)).toBe(true)
    expect(() => integerGameDecimalFromNumber(1.25)).toThrow(RangeError)
    expect(() =>
      integerGameDecimalFromCanonicalString('1.25e0'),
    ).toThrow(RangeError)
    expect(
      gameDecimalToCanonicalString(
        integerGameDecimalFromCanonicalString('1.25e2'),
      ),
    ).toBe('1.25e2')
  })

  it('checks number bounds, overflow, and positive underflow', () => {
    expect(
      gameDecimalToNumberChecked(gameDecimalFromCanonicalString('1.25e2'), {
        minimum: 100,
        maximum: 200,
      }),
    ).toBe(125)
    expect(() =>
      gameDecimalToNumberChecked(gameDecimalFromCanonicalString('1e309')),
    ).toThrow(RangeError)
    expect(() =>
      gameDecimalToNumberChecked(gameDecimalFromCanonicalString('1e-325')),
    ).toThrow(RangeError)
    expect(() =>
      gameDecimalToNumberChecked(gameDecimalFromNumber(5), {
        maximum: 4,
      }),
    ).toThrow(RangeError)
  })

  it('converts practical integer values directly to bounded bigint', () => {
    const value = integerGameDecimalFromCanonicalString('1.2345e20')

    expect(gameDecimalToBigIntChecked(value)).toBe(123_450_000_000_000_000_000n)
    expect(
      gameDecimalToBigIntChecked(value, {
        maximum: 123_450_000_000_000_000_000n,
      }),
    ).toBe(123_450_000_000_000_000_000n)
    expect(() =>
      gameDecimalToBigIntChecked(gameDecimalFromCanonicalString('1.25e0')),
    ).toThrow(RangeError)
    expect(() =>
      gameDecimalToBigIntChecked(value, {
        maximum: 123_449_999_999_999_999_999n,
      }),
    ).toThrow(RangeError)
    expect(() =>
      gameDecimalToBigIntChecked(
        gameDecimalFromCanonicalString('1e4096'),
      ),
    ).toThrow(RangeError)
    expect(() =>
      gameDecimalToBigIntChecked(value, {
        maximum: 1 as unknown as bigint,
      }),
    ).toThrow(TypeError)
    expect(() =>
      gameDecimalToBigIntChecked(value, {
        maximum: '123450000000000000000' as unknown as bigint,
      }),
    ).toThrow(TypeError)
  })
})

describe('GameDecimal scheduler conversion', () => {
  it('returns an exact zero horizon as due now', () => {
    expect(gameDecimalToSchedulerSeconds(GAME_DECIMAL_ZERO, 10)).toEqual({
      seconds: 0,
      reached: true,
    })
  })

  it('clamps tiny positive horizons before number underflow', () => {
    expect(
      gameDecimalToSchedulerSeconds(
        gameDecimalFromCanonicalString('1e-8999999999999999'),
        10,
      ),
    ).toEqual({
      seconds: GAME_DECIMAL_MINIMUM_SCHEDULER_SECONDS,
      reached: true,
    })
  })

  it('fails closed when the minimum scheduler step exceeds the slice', () => {
    expect(
      gameDecimalToSchedulerSeconds(
        gameDecimalFromCanonicalString('1e-13'),
        5e-13,
      ),
    ).toEqual({ seconds: 5e-13, reached: false })
  })

  it('compares huge horizons against the slice before narrowing', () => {
    expect(
      gameDecimalToSchedulerSeconds(
        gameDecimalFromCanonicalString('1e8999999999999999'),
        0.25,
      ),
    ).toEqual({ seconds: 0.25, reached: false })
  })

  it('returns in-slice seconds that never compare below the horizon', () => {
    const horizon = gameDecimalFromCanonicalString('2.993601483643416e-11')
    const nearest = gameDecimalToNumberChecked(horizon)
    const result = gameDecimalToSchedulerSeconds(horizon, 1)
    const convertedBack = gameDecimalFromNumber(result.seconds)

    expect(compareGameDecimals(gameDecimalFromNumber(nearest), horizon)).toBe(
      -1,
    )
    expect(result.reached).toBe(true)
    expect(result.seconds).toBeGreaterThan(nearest)
    expect(result.seconds).toBeGreaterThanOrEqual(
      GAME_DECIMAL_MINIMUM_SCHEDULER_SECONDS,
    )
    expect(compareGameDecimals(convertedBack, horizon)).toBeGreaterThanOrEqual(
      0,
    )
  })

  it('rejects invalid slice bounds', () => {
    expect(() =>
      gameDecimalToSchedulerSeconds(GAME_DECIMAL_ONE, Number.POSITIVE_INFINITY),
    ).toThrow(RangeError)
    expect(() =>
      gameDecimalToSchedulerSeconds(GAME_DECIMAL_ONE, -1),
    ).toThrow(RangeError)
  })
})
