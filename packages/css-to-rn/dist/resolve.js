import mediaQuery from 'css-mediaquery'
import { compileCss } from './compiler.js'
import { diagnostic } from './diagnostics.js'
import { simpleNumericHash } from './hash.js'
import { transformDeclarations } from './transform/index.js'
import { resolveCssValue } from './values.js'
let lastRawCss
let lastRawSheet
let unknownIdentityCounter = 0
const unknownObjectIds = new WeakMap()
const unknownPrimitiveIds = new Map()
const defaultCache = createCssxCache()
export function createCssxCache (options = {}) {
  return {
    maxEntries: options.maxEntries ?? 100,
    entries: new Map()
  }
}
export function clearCssxRuntimeCachesForTests () {
  lastRawCss = undefined
  lastRawSheet = undefined
  defaultCache.entries.clear()
  unknownPrimitiveIds.clear()
}
export function cssx (styleName, layers, inlineStyleProps, options = {}) {
  return resolveCssx({
    ...options,
    styleName,
    layers,
    inlineStyleProps
  }).props
}
export function resolveCssx (options) {
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
    const currentSignature = createDynamicSignature(cached.result.dependencies, options)
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
function resolveCssxUncached (options, layers, classNames) {
  const context = {
    target: options.target ?? 'react-native',
    variables: options.variables,
    defaultVariables: options.defaultVariables,
    dimensions: options.dimensions,
    dependencies: createDependencies(),
    diagnostics: [],
  }
  const classSet = new Set(classNames)
  const props = {}
  for (const layer of layers) { context.dependencies.sheets.add(layer.sheet.id) }
  const matchedRules = getMatchedRules(layers, classSet, context)
  const byProp = new Map()
  for (const matched of matchedRules) {
    const propName = getPartPropName(matched.rule.part)
    const rules = byProp.get(propName)
    if (rules) { rules.push(matched) } else { byProp.set(propName, [matched]) }
  }
  for (const [propName, rules] of byProp) {
    const style = resolvePropStyle(rules, context)
    if (Object.keys(style).length > 0) { mergeStyleProp(props, propName, style) }
  }
  mergeInlineStyleProps(props, options.inlineStyleProps)
  return {
    props,
    diagnostics: context.diagnostics,
    dependencies: serializeDependencies(context.dependencies),
    cacheHit: false
  }
}
function getMatchedRules (layers, classSet, context) {
  const matched = []
  layers.forEach((layer, layerIndex) => {
    for (const rule of layer.sheet.rules) {
      if (!ruleMatchesClasses(rule, classSet)) { continue }
      if (!ruleMatchesMedia(rule, context)) { continue }
      matched.push({ rule, layer, layerIndex })
    }
  })
  return matched.sort((left, right) => left.layerIndex - right.layerIndex ||
        left.rule.specificity - right.rule.specificity ||
        left.rule.order - right.rule.order)
}
function resolvePropStyle (rules, context) {
  const declarations = []
  const keyframeNames = new Set()
  let order = 0
  for (const matched of rules) {
    for (const declaration of matched.rule.declarations) {
      const resolved = resolveDeclarationValue(declaration, matched.layer, context)
      if (!resolved) { continue }
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
function resolveDeclarationValue (declaration, layer, context) {
  const result = resolveCssValue(declaration.value, {
    values: layer.values,
    variables: context.variables,
    defaultVariables: context.defaultVariables,
    dimensions: context.dimensions
  })
  for (const varName of result.dependencies.vars) { context.dependencies.vars.add(varName) }
  if (result.dependencies.dimensions) { context.dependencies.dimensions = true }
  context.diagnostics.push(...result.diagnostics)
  return result.valid ? result.value : undefined
}
function resolveKeyframes (rules, keyframeNames, context) {
  const resolved = {}
  const seen = new Set()
  for (let index = rules.length - 1; index >= 0; index--) {
    const layer = rules[index].layer
    for (const keyframeName of keyframeNames) {
      if (seen.has(keyframeName)) { continue }
      const keyframes = layer.sheet.keyframes[keyframeName]
      if (!keyframes) { continue }
      resolved[keyframeName] = resolveSingleKeyframes(keyframes, layer, context)
      seen.add(keyframeName)
    }
  }
  return resolved
}
function resolveSingleKeyframes (keyframes, layer, context) {
  const style = {}
  for (const frame of keyframes) {
    const declarations = []
    for (const declaration of frame.declarations) {
      const resolved = resolveDeclarationValue(declaration, layer, context)
      if (!resolved) { continue }
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
function inlineAnimationKeyframes (style, keyframes) {
  if (style.animationName == null) { return }
  if (Array.isArray(style.animationName)) {
    style.animationName = style.animationName.map(value => typeof value === 'string' && value !== 'none' && keyframes[value] != null
      ? keyframes[value]
      : value)
    return
  }
  if (typeof style.animationName === 'string' &&
        style.animationName !== 'none' &&
        keyframes[style.animationName] != null) {
    style.animationName = keyframes[style.animationName]
  }
}
function collectAnimationNames (value, output) {
  if (typeof value === 'string') {
    if (value !== 'none') { output.add(value) }
    return
  }
  if (!Array.isArray(value)) { return }
  for (const item of value) { collectAnimationNames(item, output) }
}
function ruleMatchesClasses (rule, classSet) {
  return rule.classes.every(className => classSet.has(className))
}
function ruleMatchesMedia (rule, context) {
  if (!rule.media) { return true }
  const query = stripMediaPrefix(rule.media)
  context.dependencies.media.add(query)
  return matchesMediaQuery(query, context.dimensions)
}
function matchesMediaQuery (query, dimensions) {
  try {
    return mediaQuery.match(query, mediaValues(dimensions))
  } catch {
    return false
  }
}
function mediaValues (dimensions) {
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
function stripMediaPrefix (media) {
  return media.replace(/^@media\s*/i, '').trim()
}
function getPartPropName (part) {
  return part ? `${part}Style` : 'style'
}
function normalizeLayers (layers) {
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
function compileRawCss (css) {
  if (css === lastRawCss && lastRawSheet) { return lastRawSheet }
  lastRawCss = css
  lastRawSheet = compileCss(css, { mode: 'runtime' })
  return lastRawSheet
}
function isCompiledSheet (value) {
  return Boolean(value &&
        typeof value === 'object' &&
        value.version === 1 &&
        Array.isArray(value.rules))
}
function normalizeStyleName (value) {
  const className = classcat(value)
  return className.split(/\s+/).filter(Boolean).sort()
}
function classcat (value) {
  if (value == null || value === false) { return '' }
  if (typeof value === 'string' || typeof value === 'number') { return value ? String(value) : '' }
  if (Array.isArray(value)) {
    let output = ''
    for (const item of value) {
      const nested = classcat(item)
      if (nested) { output += (output ? ' ' : '') + nested }
    }
    return output
  }
  let output = ''
  const record = value
  for (const key of Object.keys(record)) {
    if (record[key]) { output += (output ? ' ' : '') + key }
  }
  return output
}
function mergeInlineStyleProps (props, inlineStyleProps) {
  if (!inlineStyleProps) { return }
  if (isStylePropsInput(inlineStyleProps)) {
    for (const propName of Object.keys(inlineStyleProps)) {
      mergeStyleProp(props, propName, inlineStyleProps[propName])
    }
    return
  }
  mergeStyleProp(props, 'style', inlineStyleProps)
}
function isStylePropsInput (value) {
  return Object.keys(value).some(key => key === 'style' || key.endsWith('Style'))
}
function mergeStyleProp (props, propName, style) {
  if (style == null || style === false) { return }
  const current = props[propName]
  const flattened = {}
  flattenStyleInto(current, flattened)
  flattenStyleInto(style, flattened)
  props[propName] = flattened
}
function flattenStyleInto (value, output) {
  if (value == null || value === false) { return }
  if (Array.isArray(value)) {
    for (const item of value) { flattenStyleInto(item, output) }
    return
  }
  if (typeof value === 'object') { Object.assign(output, value) }
}
function createStableKey (options, classNames, layers, inlineHash) {
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
function createDynamicSignature (dependencies, options) {
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
function hashInlineStyleProps (inlineStyleProps) {
  if (!inlineStyleProps) { return '0' }
  try {
    return String(simpleNumericHash(JSON.stringify(inlineStyleProps)))
  } catch {
    return undefined
  }
}
function flattenLayerValues (layers) {
  const values = []
  for (const layer of layers) { values.push(...layer.values) }
  return values
}
function sameValues (left, right) {
  if (left.length !== right.length) { return false }
  for (let index = 0; index < left.length; index++) {
    if (!Object.is(left[index], right[index])) { return false }
  }
  return true
}
function remember (cache, key, entry) {
  cache.entries.delete(key)
  cache.entries.set(key, entry)
  while (cache.entries.size > cache.maxEntries) {
    const oldestKey = cache.entries.keys().next().value
    if (oldestKey == null) { break }
    cache.entries.delete(oldestKey)
  }
}
function identityFor (value) {
  if (value && (typeof value === 'object' || typeof value === 'function')) {
    const object = value
    const existing = unknownObjectIds.get(object)
    if (existing != null) { return `o:${existing}` }
    const id = ++unknownIdentityCounter
    unknownObjectIds.set(object, id)
    return `o:${id}`
  }
  const existing = unknownPrimitiveIds.get(value)
  if (existing != null) { return `p:${existing}` }
  const id = ++unknownIdentityCounter
  unknownPrimitiveIds.set(value, id)
  return `p:${id}`
}
function createDependencies () {
  return {
    vars: new Set(),
    dimensions: false,
    media: new Set(),
    sheets: new Set()
  }
}
function serializeDependencies (dependencies) {
  return {
    vars: Array.from(dependencies.vars).sort(),
    dimensions: dependencies.dimensions,
    media: Array.from(dependencies.media).sort(),
    sheets: Array.from(dependencies.sheets).sort()
  }
}
function toCssxDiagnostic (item) {
  return diagnostic(item.code, item.message, 'warning')
}
function valueFromRecord (record, key) {
  if (!record || !Object.prototype.hasOwnProperty.call(record, key)) { return undefined }
  return record[key]
}
