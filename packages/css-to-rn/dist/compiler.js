import parseCss from 'css/lib/parse/index.js'
import mediaQuery from 'css-mediaquery'
import valueParser from 'postcss-value-parser'
import { addDiagnostic, diagnostic } from './diagnostics.js'
import { cssxHash } from './hash.js'
import { parseSelector } from './selectors.js'
const VAR_RE = /var\(\s*(--[A-Za-z0-9_-]+)/
const VIEWPORT_UNIT_RE = /(?:^|[^\w-])[-+]?(?:\d*\.)?\d+(?:vh|vw|vmin|vmax)\b/
const DYNAMIC_SLOT_RE = /var\(\s*--__cssx_dynamic_(\d+)\b/g
const ANIMATION_PROPS = new Set([
  'animation',
  'animation-name',
  'animation-duration',
  'animation-timing-function',
  'animation-delay',
  'animation-iteration-count',
  'animation-direction',
  'animation-fill-mode',
  'animation-play-state'
])
const TRANSITION_PROPS = new Set([
  'transition',
  'transition-property',
  'transition-duration',
  'transition-timing-function',
  'transition-delay'
])
export function compileCss (css, options = {}) {
  return compileCssInternal(css, options)
}
export function compileCssTemplate (css, options = {}) {
  return compileCssInternal(css, {
    ...options,
    sourceIdentity: options.sourceIdentity ?? options.id
  }, true)
}
function compileCssInternal (css, options, isTemplate = false) {
  const mode = options.mode ?? 'runtime'
  const state = { mode, diagnostics: [] }
  const contentHash = options.contentHash ?? cssxHash(css)
  const sourceId = options.sourceId ?? (options.sourceIdentity ? cssxHash(options.sourceIdentity) : undefined)
  const id = options.id ?? cssxHash(`${sourceId ?? 'runtime'}:${contentHash}`)
  const empty = () => createSheet({
    id,
    sourceId,
    contentHash,
    diagnostics: state.diagnostics,
    error: state.diagnostics.find(item => item.level === 'error')
  })
  let ast
  try {
    ast = parseCss(css, { silent: false })
  } catch (error) {
    const err = error
    const item = diagnostic('CSS_SYNTAX_ERROR', err.reason ?? err.message, 'error', { line: err.line, column: err.column })
    addDiagnostic(state, item)
    return empty()
  }
  const rules = []
  const keyframes = {}
  const exports = {}
  let order = 0
  for (const rule of ast.stylesheet?.rules ?? []) {
    if (rule.type === 'rule') {
      const styleRule = rule
      compileRuleList(styleRule.selectors ?? [], styleRule.declarations ?? [], null, rules, state, orderRef(() => order++), isTemplate, exports)
      continue
    }
    if (rule.type === 'media') {
      const mediaRule = rule
      const media = `@media ${mediaRule.media ?? ''}`.trim()
      const mediaIsValid = validateMedia(mediaRule, state, isTemplate)
      if (!mediaIsValid && state.mode === 'build') { continue }
      for (const child of mediaRule.rules ?? []) {
        if (child.type !== 'rule') { continue }
        compileRuleList(child.selectors ?? [], child.declarations ?? [], media, rules, state, orderRef(() => order++), isTemplate, exports)
      }
      continue
    }
    if (rule.type === 'keyframes') {
      const keyframesRule = rule
      const name = keyframesRule.name
      if (!name) { continue }
      keyframes[name] = compileKeyframes(keyframesRule, state, orderRef(() => order++), isTemplate)
      continue
    }
    if (rule.type !== 'comment') {
      addDiagnostic(state, diagnostic('UNSUPPORTED_AT_RULE', `Unsupported at-rule or CSS rule type "${rule.type}" ignored.`, 'warning', positionOf(rule)))
    }
  }
  const metadata = buildMetadata(rules, keyframes, isTemplate)
  return createSheet({
    id,
    sourceId,
    contentHash,
    rules,
    keyframes,
    exports: Object.keys(exports).length > 0 ? exports : undefined,
    metadata,
    diagnostics: state.diagnostics,
    error: state.diagnostics.find(item => item.level === 'error')
  })
}
function compileRuleList (selectors, declarations, media, output, state, nextOrder, isTemplate, exports) {
  for (const selector of selectors) {
    if (selector === ':export') {
      compileExports(declarations, exports, state, isTemplate)
      continue
    }
    if (selector.trim().startsWith(':root')) {
      addDiagnostic(state, diagnostic('UNSUPPORTED_SELECTOR', `Unsupported selector "${selector}" ignored. Use setDefaultVariables() for CSS variable defaults.`, 'warning'))
      continue
    }
    const parsed = parseSelector(selector, positionOfDeclarationList(declarations))
    if (parsed.diagnostic) {
      addDiagnostic(state, parsed.diagnostic)
      continue
    }
    if (!parsed.result) { continue }
    output.push({
      selector: parsed.result.selector,
      classes: parsed.result.classes,
      part: parsed.result.part,
      specificity: parsed.result.specificity,
      order: nextOrder(),
      media,
      declarations: compileDeclarations(declarations, state, isTemplate)
    })
  }
}
function compileExports (declarations, exports, state, isTemplate) {
  for (const declaration of declarations) {
    if (declaration.type !== 'declaration') { continue }
    if (isTemplate && hasDynamicSlots(declaration.value ?? '')) {
      addDiagnostic(state, diagnostic('UNSUPPORTED_INTERPOLATION_POSITION', 'Interpolation is not supported inside :export blocks.', 'error', positionOf(declaration)))
      continue
    }
    if (declaration.property) { exports[declaration.property] = declaration.value ?? '' }
  }
}
function compileDeclarations (declarations, state, isTemplate) {
  const output = []
  let order = 0
  for (const declaration of declarations) {
    if (declaration.type !== 'declaration') { continue }
    const property = declaration.property
    const value = declaration.value ?? ''
    if (!property) { continue }
    if (property.startsWith('--')) {
      addDiagnostic(state, diagnostic('INVALID_DECLARATION', `CSS custom property declaration "${property}" ignored. Use variables or setDefaultVariables() instead.`, 'warning', positionOf(declaration)))
      continue
    }
    const dynamicSlots = isTemplate ? getDynamicSlots(value) : undefined
    output.push({
      property,
      value,
      raw: `${property}: ${value}`,
      order: order++,
      dynamicSlots,
      line: declaration.position?.start?.line,
      column: declaration.position?.start?.column
    })
  }
  return output
}
function compileKeyframes (rule, state, nextOrder, isTemplate) {
  const output = []
  for (const frame of rule.keyframes ?? []) {
    output.push({
      selector: (frame.values ?? []).join(', '),
      declarations: compileDeclarations(frame.declarations ?? [], state, isTemplate),
      order: nextOrder()
    })
  }
  return output
}
function validateMedia (rule, state, isTemplate) {
  if (isTemplate && hasDynamicSlots(rule.media ?? '')) {
    addDiagnostic(state, diagnostic('UNSUPPORTED_INTERPOLATION_POSITION', 'Interpolation is not supported inside media queries.', 'error', positionOf(rule)))
    return false
  }
  try {
    mediaQuery.parse(rule.media ?? '')
    return true
  } catch (error) {
    addDiagnostic(state, diagnostic('UNSUPPORTED_AT_RULE', `Unsupported media query "${rule.media ?? ''}" ignored: ${error.message}`, 'warning', positionOf(rule)))
    return false
  }
}
function buildMetadata (rules, keyframes, isTemplate) {
  const vars = new Set()
  let hasMedia = false
  let hasViewportUnits = false
  let hasAnimations = Object.keys(keyframes).length > 0
  let hasTransitions = false
  let hasInterpolations = isTemplate
  for (const rule of rules) {
    if (rule.media) { hasMedia = true }
    scanDeclarations(rule.declarations)
  }
  for (const frames of Object.values(keyframes)) {
    for (const frame of frames) { scanDeclarations(frame.declarations) }
  }
  function scanDeclarations (declarations) {
    for (const declaration of declarations) {
      collectVars(declaration.value, vars)
      if (VIEWPORT_UNIT_RE.test(declaration.value)) { hasViewportUnits = true }
      if (ANIMATION_PROPS.has(declaration.property)) { hasAnimations = true }
      if (TRANSITION_PROPS.has(declaration.property)) { hasTransitions = true }
      if (declaration.dynamicSlots && declaration.dynamicSlots.length > 0) { hasInterpolations = true }
    }
  }
  return {
    hasVars: vars.size > 0,
    vars: Array.from(vars).sort(),
    hasMedia,
    hasViewportUnits,
    hasInterpolations,
    hasDynamicRuntimeDependencies: vars.size > 0 || hasMedia || hasViewportUnits || hasInterpolations,
    hasAnimations,
    hasTransitions
  }
}
function collectVars (value, vars) {
  const parsed = valueParser(value)
  parsed.walk(node => {
    if (node.type !== 'function' || node.value !== 'var') { return }
    const first = node.nodes.find(child => child.type === 'word')
    if (first?.value && VAR_RE.test(`var(${first.value})`)) { vars.add(first.value) }
  })
}
function getDynamicSlots (value) {
  const slots = []
  DYNAMIC_SLOT_RE.lastIndex = 0
  let match
  while ((match = DYNAMIC_SLOT_RE.exec(value)) != null) {
    slots.push(Number(match[1]))
  }
  return slots.length > 0 ? slots : undefined
}
function hasDynamicSlots (value) {
  DYNAMIC_SLOT_RE.lastIndex = 0
  return DYNAMIC_SLOT_RE.test(value)
}
function createSheet (input) {
  return {
    version: 1,
    id: input.id,
    sourceId: input.sourceId,
    contentHash: input.contentHash,
    rules: input.rules ?? [],
    keyframes: input.keyframes ?? {},
    exports: input.exports,
    metadata: input.metadata ?? {
      hasVars: false,
      vars: [],
      hasMedia: false,
      hasViewportUnits: false,
      hasInterpolations: false,
      hasDynamicRuntimeDependencies: false,
      hasAnimations: false,
      hasTransitions: false
    },
    diagnostics: input.diagnostics,
    error: input.error
  }
}
function orderRef (next) {
  return next
}
function positionOf (node) {
  return {
    line: node.position?.start?.line,
    column: node.position?.start?.column
  }
}
function positionOfDeclarationList (declarations) {
  const first = declarations.find(item => item.position)
  return first ? positionOf(first) : undefined
}
