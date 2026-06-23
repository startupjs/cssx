import mediaQuery from 'css-mediaquery'
import { compileCss } from './compiler.ts'
import { diagnostic } from './diagnostics.ts'
import { simpleNumericHash } from './hash.ts'
import { transformDeclarations } from './transform/index.ts'
import type {
  CssDeclaration,
  TransformStyle,
  TransformStyleValue
} from './transform/index.ts'
import { coerceCssValue, resolveCssValue } from './values.ts'
import type {
  CompiledCssSheet,
  CssxDeclaration,
  CssxDiagnostic,
  CssxKeyframe,
  CssxRule,
  CssxTarget
} from './types.ts'

export type StyleNameValue =
  | string
  | number
  | null
  | undefined
  | false
  | Record<string, unknown>
  | readonly StyleNameValue[]

export type CssxLayerInput =
  | string
  | CompiledCssSheet
  | ResolveCssxLayer

export interface ResolveCssxLayer {
  sheet: CompiledCssSheet | string
  values?: readonly unknown[]
  cacheKey?: unknown
}

export interface ResolveCssxOptions {
  styleName: StyleNameValue
  layers?: CssxLayerInput | readonly CssxLayerInput[]
  inlineStyleProps?: InlineStyleInput
  variables?: Record<string, unknown>
  scopedVariables?: readonly Record<string, unknown>[]
  defaultVariables?: Record<string, unknown>
  dimensions?: CssxDimensions
  mediaQueryEvaluator?: CssxMediaQueryEvaluator
  target?: CssxTarget
  componentTag?: string | null
  theme?: string | null
  cache?: boolean | CssxCache
  cacheMaxEntries?: number
}

export interface CssxDimensions {
  width?: number
  height?: number
  type?: string
}

export type CssxMediaQueryEvaluator = (
  query: string,
  dimensions: CssxDimensions | undefined
) => boolean

export type InlineStyleInput =
  | TransformStyle
  | ResolvedStyleProps
  | null
  | undefined
  | false

export interface ResolvedStyleProps {
  [propName: string]: TransformStyleValue
}

export interface ResolveCssxResult {
  props: ResolvedStyleProps
  diagnostics: CssxDiagnostic[]
  dependencies: ResolveCssxDependencies
  cacheHit: boolean
}

export interface ResolveCssxDependencies {
  vars: string[]
  dimensions: boolean
  media: string[]
  mediaMatches?: Record<string, boolean>
  sheets: string[]
}

export interface CssxCache {
  maxEntries: number
  entries: Map<string, ResolveCacheEntry>
}

interface ResolveCacheEntry {
  dynamicSignature: string
  values: readonly unknown[]
  result: ResolveCssxResult
}

interface NormalizedLayer {
  sheet: CompiledCssSheet
  values: readonly unknown[]
  cacheKey?: unknown
}

interface MutableDependencies {
  vars: Set<string>
  dimensions: boolean
  media: Map<string, boolean>
  sheets: Set<string>
}

interface ResolutionContext {
  target: CssxTarget
  variables?: Record<string, unknown>
  scopedVariables?: readonly Record<string, unknown>[]
  defaultVariables?: Record<string, unknown>
  customMedia?: Record<string, string>
  dimensions?: CssxDimensions
  mediaQueryEvaluator?: CssxMediaQueryEvaluator
  componentTag?: string | null
  theme: string
  dependencies: MutableDependencies
  diagnostics: CssxDiagnostic[]
}

interface MatchedRule {
  rule: CssxRule
  layer: NormalizedLayer
  layerIndex: number
}

let lastRawCss: string | undefined
let lastRawSheet: CompiledCssSheet | undefined
let unknownIdentityCounter = 0
const unknownObjectIds = new WeakMap<object, number>()
const unknownPrimitiveIds = new Map<unknown, number>()
const defaultCache = createCssxCache()
const DYNAMIC_ROOT_SLOT_RE = /var\(\s*--__cssx_dynamic_(\d+)\s*\)/g
const THEME_MEDIA_RE = /^\(--theme-([A-Za-z0-9_-]+)\)$/
const CUSTOM_MEDIA_RE = /^\((--[A-Za-z0-9_-]+)\)$/
const RANGE_MEDIA_RE = /^\((width|height)\s*(<=|>=|<|>)\s*(.+)\)$/

export function createCssxCache (options: { maxEntries?: number } = {}): CssxCache {
  return {
    maxEntries: options.maxEntries ?? 100,
    entries: new Map()
  }
}

export function clearCssxRuntimeCachesForTests (): void {
  lastRawCss = undefined
  lastRawSheet = undefined
  defaultCache.entries.clear()
  unknownPrimitiveIds.clear()
}

export function cssx (
  styleName: StyleNameValue,
  layers?: CssxLayerInput | readonly CssxLayerInput[],
  inlineStyleProps?: InlineStyleInput,
  options: Omit<ResolveCssxOptions, 'styleName' | 'layers' | 'inlineStyleProps'> = {}
): ResolvedStyleProps {
  return resolveCssx({
    ...options,
    styleName,
    layers,
    inlineStyleProps
  }).props
}

export function resolveCssx (options: ResolveCssxOptions): ResolveCssxResult {
  const layers = normalizeLayers(options.layers)
  const classNames = normalizeStyleName(options.styleName)
  const inlineHash = hashInlineStyleProps(options.inlineStyleProps)
  const values = flattenLayerValues(layers)
  const cache = options.cache === false
    ? undefined
    : options.cache === true || options.cache == null
      ? defaultCache
      : options.cache
  const stableKey = inlineHash == null
    ? undefined
    : createStableKey(options, classNames, layers, inlineHash)
  const cached = cache && stableKey
    ? cache.entries.get(stableKey)
    : undefined

  if (cached && sameValues(cached.values, values)) {
    const currentSignature = createDynamicSignature(
      cached.result.dependencies,
      options,
      layers
    )
    if (currentSignature === cached.dynamicSignature) {
      return {
        ...cached.result,
        cacheHit: true
      }
    }
  }

  const result = resolveCssxUncached(options, layers, classNames)
  const dynamicSignature = createDynamicSignature(result.dependencies, options, layers)

  if (cache && stableKey) {
    remember(cache, stableKey, {
      dynamicSignature,
      values,
      result
    })
  }

  return result
}

function resolveCssxUncached (
  options: ResolveCssxOptions,
  layers: readonly NormalizedLayer[],
  classNames: readonly string[]
): ResolveCssxResult {
  const scopedVariables = collectScopedVariables(options.scopedVariables, layers, options.theme)
  const customMedia = collectCustomMedia(layers)
  const context: ResolutionContext = {
    target: options.target ?? 'react-native',
    variables: options.variables,
    scopedVariables,
    defaultVariables: options.defaultVariables,
    customMedia,
    dimensions: options.dimensions,
    mediaQueryEvaluator: options.mediaQueryEvaluator,
    componentTag: options.componentTag ?? null,
    theme: normalizeTheme(options.theme),
    dependencies: createDependencies(),
    diagnostics: [],
  }
  const classSet = new Set(classNames)
  const props: ResolvedStyleProps = {}

  for (const layer of layers) context.dependencies.sheets.add(layer.sheet.id)

  const matchedRules = getMatchedRules(layers, classSet, context)
  const byProp = new Map<string, MatchedRule[]>()
  for (const matched of matchedRules) {
    const propName = getPartPropName(matched.rule.part)
    const rules = byProp.get(propName)
    if (rules) rules.push(matched)
    else byProp.set(propName, [matched])
  }

  for (const [propName, rules] of byProp) {
    const style = resolvePropStyle(rules, context)
    if (Object.keys(style).length > 0) mergeStyleProp(props, propName, style)
  }

  mergeInlineStyleProps(props, options.inlineStyleProps, context)

  return {
    props,
    diagnostics: context.diagnostics,
    dependencies: serializeDependencies(context.dependencies),
    cacheHit: false
  }
}

function getMatchedRules (
  layers: readonly NormalizedLayer[],
  classSet: ReadonlySet<string>,
  context: ResolutionContext
): MatchedRule[] {
  const matched: MatchedRule[] = []

  layers.forEach((layer, layerIndex) => {
    for (const rule of layer.sheet.rules) {
      if (!ruleMatchesTag(rule, context.componentTag)) continue
      if (!ruleMatchesClasses(rule, classSet)) continue
      if (!ruleMatchesMedia(rule, context)) continue
      matched.push({ rule, layer, layerIndex })
    }
  })

  return matched.sort((left, right) =>
    left.layerIndex - right.layerIndex ||
    left.rule.specificity - right.rule.specificity ||
    left.rule.order - right.rule.order
  )
}

function resolvePropStyle (
  rules: readonly MatchedRule[],
  context: ResolutionContext
): TransformStyle {
  const declarations: CssDeclaration[] = []
  const keyframeNames = new Set<string>()
  let order = 0

  for (const matched of rules) {
    for (const declaration of matched.rule.declarations) {
      const resolved = resolveDeclarationValue(declaration, matched.layer, context)
      if (!resolved) continue
      declarations.push({
        property: declaration.property,
        value: resolved,
        raw: `${declaration.property}: ${resolved}`,
        order: order++
      })
    }
  }

  const transformed = transformDeclarations(declarations, {
    platform: context.target,
    keyframes: {},
  })
  context.diagnostics.push(...transformed.diagnostics.map(toCssxDiagnostic))

  collectAnimationNames(transformed.style.animationName, keyframeNames)
  if (keyframeNames.size > 0) {
    const keyframes = resolveKeyframes(rules, keyframeNames, context)
    inlineAnimationKeyframes(transformed.style, keyframes)
  }

  return transformed.style
}

function resolveDeclarationValue (
  declaration: CssxDeclaration,
  layer: NormalizedLayer,
  context: ResolutionContext
): string | undefined {
  const result = resolveCssValue(declaration.value, {
    values: layer.values,
    variables: context.variables,
    scopedVariables: context.scopedVariables,
    defaultVariables: context.defaultVariables,
    dimensions: context.dimensions
  })

  for (const varName of result.dependencies.vars) context.dependencies.vars.add(varName)
  if (result.dependencies.dimensions) context.dependencies.dimensions = true
  context.diagnostics.push(...result.diagnostics)

  return result.valid ? result.value : undefined
}

function resolveKeyframes (
  rules: readonly MatchedRule[],
  keyframeNames: ReadonlySet<string>,
  context: ResolutionContext
): Record<string, TransformStyle> {
  const resolved: Record<string, TransformStyle> = {}
  const seen = new Set<string>()

  for (let index = rules.length - 1; index >= 0; index--) {
    const layer = rules[index].layer

    for (const keyframeName of keyframeNames) {
      if (seen.has(keyframeName)) continue
      const keyframes = layer.sheet.keyframes[keyframeName]
      if (!keyframes) continue
      resolved[keyframeName] = resolveSingleKeyframes(keyframes, layer, context)
      seen.add(keyframeName)
    }
  }

  return resolved
}

function resolveSingleKeyframes (
  keyframes: readonly CssxKeyframe[],
  layer: NormalizedLayer,
  context: ResolutionContext
): TransformStyle {
  const style: TransformStyle = {}

  for (const frame of keyframes) {
    const declarations: CssDeclaration[] = []
    for (const declaration of frame.declarations) {
      const resolved = resolveDeclarationValue(declaration, layer, context)
      if (!resolved) continue
      declarations.push({
        property: declaration.property,
        value: resolved,
        raw: `${declaration.property}: ${resolved}`,
        order: declaration.order
      })
    }

    const transformed = transformDeclarations(declarations, {
      platform: context.target,
      keyframes: {},
    })
    context.diagnostics.push(...transformed.diagnostics.map(toCssxDiagnostic))
    style[frame.selector] = transformed.style
  }

  return style
}

function inlineAnimationKeyframes (
  style: TransformStyle,
  keyframes: Record<string, TransformStyle>
): void {
  if (style.animationName == null) return

  if (Array.isArray(style.animationName)) {
    style.animationName = style.animationName.map(value =>
      typeof value === 'string' && value !== 'none' && keyframes[value] != null
        ? keyframes[value]
        : value
    )
    return
  }

  if (
    typeof style.animationName === 'string' &&
    style.animationName !== 'none' &&
    keyframes[style.animationName] != null
  ) {
    style.animationName = keyframes[style.animationName]
  }
}

function collectAnimationNames (
  value: TransformStyleValue,
  output: Set<string>
): void {
  if (typeof value === 'string') {
    if (value !== 'none') output.add(value)
    return
  }

  if (!Array.isArray(value)) return
  for (const item of value) collectAnimationNames(item, output)
}

function ruleMatchesClasses (
  rule: CssxRule,
  classSet: ReadonlySet<string>
): boolean {
  return rule.classes.every(className => classSet.has(className))
}

function ruleMatchesTag (
  rule: CssxRule,
  componentTag: string | null | undefined
): boolean {
  return rule.tag == null || rule.tag === componentTag
}

function ruleMatchesMedia (
  rule: CssxRule,
  context: ResolutionContext
): boolean {
  if (!rule.media) return true

  const query = stripMediaPrefix(rule.media)
  const result = evaluateCssxMediaQuery(query, {
    variables: context.variables,
    scopedVariables: context.scopedVariables,
    defaultVariables: context.defaultVariables,
    customMedia: context.customMedia,
    dimensions: context.dimensions,
    mediaQueryEvaluator: context.mediaQueryEvaluator,
    theme: context.theme
  })
  for (const varName of result.dependencies.vars) context.dependencies.vars.add(varName)
  if (result.dependencies.dimensions) context.dependencies.dimensions = true
  context.diagnostics.push(...result.diagnostics)
  context.dependencies.media.set(query, result.matches)
  return result.matches
}

interface CssxMediaQueryEvaluationOptions {
  variables?: Record<string, unknown>
  scopedVariables?: readonly Record<string, unknown>[]
  defaultVariables?: Record<string, unknown>
  customMedia?: Record<string, string>
  dimensions?: CssxDimensions
  mediaQueryEvaluator?: CssxMediaQueryEvaluator
  theme?: string | null
}

interface CssxMediaQueryEvaluationResult {
  matches: boolean
  dependencies: {
    vars: string[]
    dimensions: boolean
  }
  diagnostics: CssxDiagnostic[]
}

export function evaluateCssxMediaQuery (
  query: string,
  options: CssxMediaQueryEvaluationOptions
): CssxMediaQueryEvaluationResult {
  const dependencies = {
    vars: new Set<string>(),
    dimensions: false
  }
  const diagnostics: CssxDiagnostic[] = []
  const matches = matchesMediaQueryBranchList(query, options, dependencies, diagnostics, [])

  return {
    matches,
    dependencies: {
      vars: Array.from(dependencies.vars).sort(),
      dimensions: dependencies.dimensions
    },
    diagnostics
  }
}

function matchesMediaQuery (
  query: string,
  dimensions: CssxDimensions | undefined,
  evaluator?: CssxMediaQueryEvaluator,
  theme?: string | null,
  customMedia?: Record<string, string>,
  variables?: Record<string, unknown>,
  scopedVariables?: readonly Record<string, unknown>[],
  defaultVariables?: Record<string, unknown>
): boolean {
  return evaluateCssxMediaQuery(query, {
    dimensions,
    mediaQueryEvaluator: evaluator,
    theme,
    customMedia,
    variables,
    scopedVariables,
    defaultVariables
  }).matches
}

function matchesMediaQueryBranchList (
  query: string,
  options: CssxMediaQueryEvaluationOptions,
  dependencies: { vars: Set<string>, dimensions: boolean },
  diagnostics: CssxDiagnostic[],
  customMediaStack: string[]
): boolean {
  const normalized = stripMediaPrefix(query)
  const branches = splitTopLevelComma(normalized)
  if (branches.length > 1) {
    return branches.some(branch => matchesSingleMediaQuery(branch, options, dependencies, diagnostics, customMediaStack))
  }

  return matchesSingleMediaQuery(normalized, options, dependencies, diagnostics, customMediaStack)
}

function matchesSingleMediaQuery (
  query: string,
  options: CssxMediaQueryEvaluationOptions,
  dependencies: { vars: Set<string>, dimensions: boolean },
  diagnostics: CssxDiagnostic[],
  customMediaStack: string[]
): boolean {
  const parts = splitTopLevelAnd(query)
  const rest: string[] = []

  for (const part of parts) {
    const trimmed = part.trim()
    const themeMatch = trimmed.match(THEME_MEDIA_RE)
    if (themeMatch) {
      if (!matchesThemeName(themeMatch[1], normalizeTheme(options.theme))) return false
      continue
    }

    const customMediaMatch = trimmed.match(CUSTOM_MEDIA_RE)
    if (customMediaMatch && options.customMedia?.[customMediaMatch[1]] != null) {
      const customMediaName = customMediaMatch[1]
      if (customMediaStack.includes(customMediaName)) {
        diagnostics.push(diagnostic(
          'INVALID_CUSTOM_MEDIA',
          `Custom media cycle detected: ${customMediaStack.concat(customMediaName).join(' -> ')}.`,
          'warning'
        ))
        return false
      }
      if (!matchesMediaQueryBranchList(
        options.customMedia[customMediaName],
        options,
        dependencies,
        diagnostics,
        customMediaStack.concat(customMediaName)
      )) {
        return false
      }
      continue
    }

    const rangeMatch = trimmed.match(RANGE_MEDIA_RE)
    if (rangeMatch) {
      const rangeMatches = evaluateRangeMedia(rangeMatch, options, dependencies, diagnostics)
      if (!rangeMatches) return false
      continue
    }

    if (trimmed) rest.push(trimmed)
  }

  if (rest.length === 0) return true

  const restQuery = resolveMediaQueryValue(rest.join(' and '), options, dependencies, diagnostics)
  if (restQuery == null) return false
  if (options.mediaQueryEvaluator) return options.mediaQueryEvaluator(restQuery, options.dimensions)

  try {
    return mediaQuery.match(restQuery, mediaValues(options.dimensions))
  } catch {
    return false
  }
}

function evaluateRangeMedia (
  match: RegExpMatchArray,
  options: CssxMediaQueryEvaluationOptions,
  dependencies: { vars: Set<string>, dimensions: boolean },
  diagnostics: CssxDiagnostic[]
): boolean {
  const feature = match[1] as 'width' | 'height'
  const operator = match[2]
  const rawValue = match[3].trim()
  const resolved = resolveMediaQueryValue(rawValue, options, dependencies, diagnostics)
  const expected = resolved == null ? null : parseMediaLength(resolved)
  if (expected == null) return false

  const actual = feature === 'width'
    ? options.dimensions?.width ?? 0
    : options.dimensions?.height ?? 0

  switch (operator) {
    case '>=':
      return actual >= expected
    case '>':
      return actual > expected
    case '<=':
      return actual <= expected
    case '<':
      return actual < expected
    default:
      return false
  }
}

function resolveMediaQueryValue (
  input: string,
  options: CssxMediaQueryEvaluationOptions,
  dependencies: { vars: Set<string>, dimensions: boolean },
  diagnostics: CssxDiagnostic[]
): string | null {
  const result = resolveCssValue(input, {
    variables: options.variables,
    scopedVariables: options.scopedVariables,
    defaultVariables: options.defaultVariables,
    dimensions: options.dimensions
  })

  for (const varName of result.dependencies.vars) dependencies.vars.add(varName)
  if (result.dependencies.dimensions) dependencies.dimensions = true
  diagnostics.push(...result.diagnostics)

  return result.valid ? result.value ?? input : null
}

function parseMediaLength (input: string): number | null {
  const match = input.trim().match(/^([-+]?(?:\d*\.)?\d+)(px|rem|em|u)?$/i)
  if (match == null) return null

  const number = Number(match[1])
  const unit = (match[2] ?? 'px').toLowerCase()
  if (!Number.isFinite(number)) return null
  if (unit === 'px') return number
  if (unit === 'rem' || unit === 'em') return number * 16
  if (unit === 'u') return number * 8
  return null
}

function mediaValues (dimensions: CssxDimensions | undefined): Record<string, unknown> {
  const width = dimensions?.width ?? 0
  const height = dimensions?.height ?? 0

  return {
    type: dimensions?.type ?? 'screen',
    width: `${width}px`,
    height: `${height}px`,
    'device-width': `${width}px`,
    'device-height': `${height}px`,
    orientation: width >= height ? 'landscape' : 'portrait'
  }
}

function stripMediaPrefix (media: string): string {
  return media.replace(/^@media\s*/i, '').trim()
}

function splitTopLevelComma (input: string): string[] {
  return splitTopLevelToken(input, ',')
}

function splitTopLevelAnd (input: string): string[] {
  const parts: string[] = []
  let depth = 0
  let start = 0
  let index = 0

  while (index < input.length) {
    const char = input[index]
    if (char === '(') depth += 1
    else if (char === ')') depth = Math.max(0, depth - 1)
    else if (
      depth === 0 &&
      input.slice(index, index + 3).toLowerCase() === 'and' &&
      isWordBoundary(input[index - 1]) &&
      isWordBoundary(input[index + 3])
    ) {
      parts.push(input.slice(start, index))
      index += 3
      start = index
      continue
    }
    index += 1
  }

  parts.push(input.slice(start))
  return parts
}

function splitTopLevelToken (input: string, token: string): string[] {
  const parts: string[] = []
  let depth = 0
  let start = 0

  for (let index = 0; index < input.length; index++) {
    const char = input[index]
    if (char === '(') depth += 1
    else if (char === ')') depth = Math.max(0, depth - 1)
    else if (depth === 0 && char === token) {
      parts.push(input.slice(start, index))
      start = index + 1
    }
  }

  parts.push(input.slice(start))
  return parts
}

function isWordBoundary (char: string | undefined): boolean {
  return char == null || !/[A-Za-z0-9_-]/.test(char)
}

function matchesThemeName (queryTheme: string, activeTheme: string): boolean {
  if (queryTheme === 'default' || queryTheme === 'light') {
    return activeTheme === 'default' || activeTheme === 'light'
  }
  return queryTheme === activeTheme
}

function normalizeTheme (theme: string | null | undefined): string {
  return theme || 'default'
}

function getPartPropName (part: string | null): string {
  return part ? `${part}Style` : 'style'
}

function normalizeLayers (
  layers: CssxLayerInput | readonly CssxLayerInput[] | undefined
): NormalizedLayer[] {
  const input = layers == null
    ? []
    : Array.isArray(layers)
      ? layers
      : [layers]

  return input.map(layer => {
    if (typeof layer === 'string') {
      return { sheet: compileRawCss(layer), values: [] }
    }

    if (isCompiledSheet(layer)) {
      return { sheet: layer, values: [] }
    }

    const sheet = typeof layer.sheet === 'string'
      ? compileRawCss(layer.sheet)
      : layer.sheet

    return {
      sheet,
      values: layer.values ?? [],
      cacheKey: layer.cacheKey
    }
  })
}

function compileRawCss (css: string): CompiledCssSheet {
  if (css === lastRawCss && lastRawSheet) return lastRawSheet
  lastRawCss = css
  lastRawSheet = compileCss(css, { mode: 'runtime' })
  return lastRawSheet
}

function isCompiledSheet (value: unknown): value is CompiledCssSheet {
  return Boolean(
    value &&
    typeof value === 'object' &&
    (value as { version?: unknown }).version === 1 &&
    Array.isArray((value as { rules?: unknown }).rules)
  )
}

function normalizeStyleName (value: StyleNameValue): string[] {
  const className = classcat(value)
  return className.split(/\s+/).filter(Boolean).sort()
}

function classcat (value: StyleNameValue): string {
  if (value == null || value === false) return ''
  if (typeof value === 'string' || typeof value === 'number') return value ? String(value) : ''

  if (Array.isArray(value)) {
    let output = ''
    for (const item of value) {
      const nested = classcat(item)
      if (nested) output += (output ? ' ' : '') + nested
    }
    return output
  }

  let output = ''
  const record = value as Record<string, unknown>
  for (const key of Object.keys(record)) {
    if (record[key]) output += (output ? ' ' : '') + key
  }
  return output
}

function mergeInlineStyleProps (
  props: ResolvedStyleProps,
  inlineStyleProps: InlineStyleInput,
  context: ResolutionContext
): void {
  if (!inlineStyleProps) return

  if (isStylePropsInput(inlineStyleProps)) {
    for (const propName of Object.keys(inlineStyleProps)) {
      mergeStyleProp(props, propName, resolveInlineStyleValue(inlineStyleProps[propName], context))
    }
    return
  }

  mergeStyleProp(props, 'style', resolveInlineStyleValue(inlineStyleProps, context))
}

function isStylePropsInput (value: TransformStyle | ResolvedStyleProps): value is ResolvedStyleProps {
  return Object.keys(value).some(key => key === 'style' || key.endsWith('Style'))
}

function mergeStyleProp (
  props: ResolvedStyleProps,
  propName: string,
  style: TransformStyleValue
): void {
  if (style == null || style === false) return

  const current = props[propName]
  const flattened: TransformStyle = {}
  flattenStyleInto(current, flattened)
  flattenStyleInto(style, flattened)
  props[propName] = flattened
}

function flattenStyleInto (
  value: TransformStyleValue,
  output: TransformStyle
): void {
  if (value == null || value === false) return
  if (Array.isArray(value)) {
    for (const item of value) flattenStyleInto(item, output)
    return
  }
  if (typeof value === 'object') Object.assign(output, value)
}

function resolveInlineStyleValue (
  value: TransformStyleValue,
  context: ResolutionContext
): TransformStyleValue {
  if (typeof value === 'string') {
    const result = resolveCssValue(value, {
      variables: context.variables,
      scopedVariables: context.scopedVariables,
      defaultVariables: context.defaultVariables,
      dimensions: context.dimensions
    })

    for (const varName of result.dependencies.vars) context.dependencies.vars.add(varName)
    if (result.dependencies.dimensions) context.dependencies.dimensions = true
    context.diagnostics.push(...result.diagnostics)

    return result.valid
      ? coerceCssValue(result.value) as TransformStyleValue
      : undefined
  }

  if (Array.isArray(value)) {
    return value.map(item => resolveInlineStyleValue(item, context))
  }

  if (value && typeof value === 'object') {
    const output: TransformStyle = {}
    for (const [key, child] of Object.entries(value)) {
      output[key] = resolveInlineStyleValue(child, context)
    }
    return output
  }

  return value
}

function createStableKey (
  options: ResolveCssxOptions,
  classNames: readonly string[],
  layers: readonly NormalizedLayer[],
  inlineHash: string
): string {
  return JSON.stringify({
    target: options.target ?? 'react-native',
    componentTag: options.componentTag ?? null,
    styleName: classNames,
    inline: inlineHash,
    layers: layers.map(layer => ({
      id: layer.sheet.id,
      contentHash: layer.sheet.contentHash,
      cacheKey: layer.cacheKey == null ? undefined : identityFor(layer.cacheKey)
    }))
  })
}

function createDynamicSignature (
  dependencies: ResolveCssxDependencies,
  options: ResolveCssxOptions,
  layers: readonly NormalizedLayer[]
): string {
  const scopedVariables = collectScopedVariables(options.scopedVariables, layers, options.theme)
  const customMedia = collectCustomMedia(layers)
  return JSON.stringify({
    theme: normalizeTheme(options.theme),
    vars: dependencies.vars.map(name => [
      name,
      valueFromRecord(options.variables, name) ??
        valueFromScopedRecords(scopedVariables, name) ??
        valueFromRecord(options.defaultVariables, name)
    ]),
    dimensions: dependencies.dimensions
      ? {
          width: options.dimensions?.width ?? 0,
          height: options.dimensions?.height ?? 0,
          type: options.dimensions?.type ?? 'screen'
        }
      : undefined,
    media: dependencies.media.map(query => [
      query,
      matchesMediaQuery(
        query,
        options.dimensions,
        options.mediaQueryEvaluator,
        options.theme,
        customMedia,
        options.variables,
        scopedVariables,
        options.defaultVariables
      )
    ])
  })
}

function hashInlineStyleProps (inlineStyleProps: InlineStyleInput): string | undefined {
  if (!inlineStyleProps) return '0'

  try {
    return String(simpleNumericHash(JSON.stringify(inlineStyleProps)))
  } catch {
    return undefined
  }
}

function flattenLayerValues (layers: readonly NormalizedLayer[]): readonly unknown[] {
  const values: unknown[] = []
  for (const layer of layers) values.push(...layer.values)
  return values
}

function collectScopedVariables (
  explicitScopes: readonly Record<string, unknown>[] | undefined,
  layers: readonly NormalizedLayer[],
  theme?: string | null
): readonly Record<string, unknown>[] | undefined {
  const scopes: Record<string, unknown>[] = explicitScopes ? [...explicitScopes] : []
  const activeTheme = normalizeTheme(theme)

  for (const layer of layers) {
    if (layer.sheet.rootVariables != null) {
      scopes.push(applyLayerValuesToRootVariables(layer.sheet.rootVariables, layer.values))
    }
    const themeRootVariables = getThemeVariables(layer.sheet, activeTheme)
    if (themeRootVariables != null) {
      scopes.push(applyLayerValuesToRootVariables(themeRootVariables, layer.values))
    }
  }

  return scopes.length > 0 ? scopes : undefined
}

function collectCustomMedia (
  layers: readonly NormalizedLayer[]
): Record<string, string> | undefined {
  let customMedia: Record<string, string> | undefined

  for (const layer of layers) {
    if (layer.sheet.customMedia == null) continue
    customMedia ??= {}
    Object.assign(customMedia, applyLayerValuesToRootVariables(layer.sheet.customMedia, layer.values))
  }

  return customMedia
}

function getThemeVariables (
  sheet: CompiledCssSheet,
  theme: string
): Record<string, string> | undefined {
  if (sheet.themeVariables == null) return undefined
  if (theme === 'light') return sheet.themeVariables.light ?? sheet.themeVariables.default
  if (theme === 'default') return sheet.themeVariables.default
  return sheet.themeVariables[theme]
}

function applyLayerValuesToRootVariables (
  rootVariables: Record<string, string>,
  values: readonly unknown[]
): Record<string, string> {
  if (values.length === 0) return rootVariables

  const output: Record<string, string> = {}
  for (const name of Object.keys(rootVariables)) {
    const value = rootVariables[name]
    let valid = true
    const next = value.replace(DYNAMIC_ROOT_SLOT_RE, (_match, rawIndex: string) => {
      const interpolation = values[Number(rawIndex)]
      if (typeof interpolation === 'string') return interpolation
      if (typeof interpolation === 'number') return String(interpolation)
      valid = false
      return ''
    })
    if (valid) output[name] = next
  }
  return output
}

function sameValues (
  left: readonly unknown[],
  right: readonly unknown[]
): boolean {
  if (left.length !== right.length) return false
  for (let index = 0; index < left.length; index++) {
    if (!Object.is(left[index], right[index])) return false
  }
  return true
}

function remember (
  cache: CssxCache,
  key: string,
  entry: ResolveCacheEntry
): void {
  cache.entries.delete(key)
  cache.entries.set(key, entry)

  while (cache.entries.size > cache.maxEntries) {
    const oldestKey = cache.entries.keys().next().value
    if (oldestKey == null) break
    cache.entries.delete(oldestKey)
  }
}

function identityFor (value: unknown): string {
  if (value && (typeof value === 'object' || typeof value === 'function')) {
    const object = value as object
    const existing = unknownObjectIds.get(object)
    if (existing != null) return `o:${existing}`
    const id = ++unknownIdentityCounter
    unknownObjectIds.set(object, id)
    return `o:${id}`
  }

  const existing = unknownPrimitiveIds.get(value)
  if (existing != null) return `p:${existing}`
  const id = ++unknownIdentityCounter
  unknownPrimitiveIds.set(value, id)
  return `p:${id}`
}

function createDependencies (): MutableDependencies {
  return {
    vars: new Set(),
    dimensions: false,
    media: new Map(),
    sheets: new Set()
  }
}

function serializeDependencies (
  dependencies: MutableDependencies
): ResolveCssxDependencies {
  return {
    vars: Array.from(dependencies.vars).sort(),
    dimensions: dependencies.dimensions,
    media: Array.from(dependencies.media.keys()).sort(),
    mediaMatches: Object.fromEntries(Array.from(dependencies.media.entries()).sort(([left], [right]) => left.localeCompare(right))),
    sheets: Array.from(dependencies.sheets).sort()
  }
}

function toCssxDiagnostic (item: {
  code: CssxDiagnostic['code']
  message: string
}): CssxDiagnostic {
  return diagnostic(item.code, item.message, 'warning')
}

function valueFromRecord (record: Record<string, unknown> | undefined, key: string): unknown {
  if (!record || !Object.prototype.hasOwnProperty.call(record, key)) return undefined
  return record[key]
}

function valueFromScopedRecords (
  records: readonly Record<string, unknown>[] | undefined,
  key: string
): unknown {
  if (!records) return undefined

  for (let index = records.length - 1; index >= 0; index--) {
    const value = valueFromRecord(records[index], key)
    if (value !== undefined) return value
  }

  return undefined
}
