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
import { resolveCssValue } from './values.ts'
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
  defaultVariables?: Record<string, unknown>
  dimensions?: CssxDimensions
  target?: CssxTarget
  cache?: boolean | CssxCache
  cacheMaxEntries?: number
}

export interface CssxDimensions {
  width?: number
  height?: number
  type?: string
}

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
  media: Set<string>
  sheets: Set<string>
}

interface ResolutionContext {
  target: CssxTarget
  variables?: Record<string, unknown>
  defaultVariables?: Record<string, unknown>
  dimensions?: CssxDimensions
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
      options
    )
    if (currentSignature === cached.dynamicSignature) {
      return {
        ...cached.result,
        cacheHit: true
      }
    }
  }

  const result = resolveCssxUncached(options, layers, classNames)
  const dynamicSignature = createDynamicSignature(result.dependencies, options)

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
  const context: ResolutionContext = {
    target: options.target ?? 'react-native',
    variables: options.variables,
    defaultVariables: options.defaultVariables,
    dimensions: options.dimensions,
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

  mergeInlineStyleProps(props, options.inlineStyleProps)

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

function ruleMatchesMedia (
  rule: CssxRule,
  context: ResolutionContext
): boolean {
  if (!rule.media) return true

  const query = stripMediaPrefix(rule.media)
  context.dependencies.media.add(query)
  return matchesMediaQuery(query, context.dimensions)
}

function matchesMediaQuery (
  query: string,
  dimensions: CssxDimensions | undefined
): boolean {
  try {
    return mediaQuery.match(query, mediaValues(dimensions))
  } catch {
    return false
  }
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
  inlineStyleProps: InlineStyleInput
): void {
  if (!inlineStyleProps) return

  if (isStylePropsInput(inlineStyleProps)) {
    for (const propName of Object.keys(inlineStyleProps)) {
      mergeStyleProp(props, propName, inlineStyleProps[propName])
    }
    return
  }

  mergeStyleProp(props, 'style', inlineStyleProps)
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

function createStableKey (
  options: ResolveCssxOptions,
  classNames: readonly string[],
  layers: readonly NormalizedLayer[],
  inlineHash: string
): string {
  return JSON.stringify({
    target: options.target ?? 'react-native',
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
  options: ResolveCssxOptions
): string {
  return JSON.stringify({
    vars: dependencies.vars.map(name => [
      name,
      valueFromRecord(options.variables, name) ??
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
      matchesMediaQuery(query, options.dimensions)
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
    media: new Set(),
    sheets: new Set()
  }
}

function serializeDependencies (
  dependencies: MutableDependencies
): ResolveCssxDependencies {
  return {
    vars: Array.from(dependencies.vars).sort(),
    dimensions: dependencies.dimensions,
    media: Array.from(dependencies.media).sort(),
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
