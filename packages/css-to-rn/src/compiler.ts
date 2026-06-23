import parseCss from 'css/lib/parse/index.js'
import mediaQuery from 'css-mediaquery'
import valueParser from 'postcss-value-parser'
import { addDiagnostic, diagnostic } from './diagnostics.ts'
import { cssxHash } from './hash.ts'
import { parseSelector } from './selectors.ts'
import { transformDeclarations } from './transform/index.ts'
import { resolveCssValue } from './values.ts'
import type {
  CompileCssOptions,
  CompileCssTemplateOptions,
  CompileState,
  CompiledCssSheet,
  CssxDeclaration,
  CssxDiagnostic,
  CssxKeyframe,
  CssxMetadata,
  CssxRule,
  CssxTarget
} from './types.ts'

const VAR_RE = /var\(\s*(--[A-Za-z0-9_-]+)/
const VAR_NAME_RE = /^--[A-Za-z0-9_-]+$/
const THEME_ROOT_SELECTOR_RE = /^:root\.([A-Za-z0-9_-]+)$/
const THEME_MEDIA_RE = /\(--theme-[A-Za-z0-9_-]+\)/
const CUSTOM_MEDIA_NAME_RE = /^--[A-Za-z0-9_-]+$/
const THEME_CUSTOM_MEDIA_NAME_RE = /^--theme-[A-Za-z0-9_-]+$/
const MEDIA_RANGE_RE = /\((?:width|height)\s*(?:<=|>=|<|>)/
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

export function compileCss (css: string, options: CompileCssOptions = {}): CompiledCssSheet {
  return compileCssInternal(css, options)
}

export function compileCssTemplate (
  css: string,
  options: CompileCssTemplateOptions = {}
): CompiledCssSheet {
  return compileCssInternal(css, {
    ...options,
    sourceIdentity: options.sourceIdentity ?? options.id
  }, true)
}

function compileCssInternal (
  css: string,
  options: CompileCssOptions,
  isTemplate = false
): CompiledCssSheet {
  const mode = options.mode ?? 'runtime'
  const state: CompileState = { mode, diagnostics: [] }
  const contentHash = options.contentHash ?? cssxHash(css)
  const sourceId = options.sourceId ?? (options.sourceIdentity ? cssxHash(options.sourceIdentity) : undefined)
  const id = options.id ?? cssxHash(`${sourceId ?? 'runtime'}:${contentHash}`)
  const empty = (): CompiledCssSheet => createSheet({
    id,
    sourceId,
    contentHash,
    diagnostics: state.diagnostics,
    error: state.diagnostics.find(item => item.level === 'error')
  })

  let ast: CssAst
  try {
    ast = parseCss(css, { silent: false }) as CssAst
  } catch (error) {
    const err = error as Error & { line?: number, column?: number, reason?: string }
    const item = diagnostic(
      'CSS_SYNTAX_ERROR',
      err.reason ?? err.message,
      'error',
      { line: err.line, column: err.column }
    )
    addDiagnostic(state, item)
    return empty()
  }

  const rules: CssxRule[] = []
  const keyframes: Record<string, CssxKeyframe[]> = {}
  const rootVariables: Record<string, string> = {}
  const themeVariables: Record<string, Record<string, string>> = {}
  const customMedia: Record<string, string> = {}
  const exports: Record<string, string> = {}
  let order = 0

  for (const rule of ast.stylesheet?.rules ?? []) {
    if (rule.type === 'rule') {
      const styleRule = rule as CssStyleRuleAst
      compileRuleList(styleRule.selectors ?? [], styleRule.declarations ?? [], null, rules, rootVariables, themeVariables, state, orderRef(() => order++), isTemplate, exports, options.target)
      continue
    }

    if (rule.type === 'media') {
      const mediaRule = rule as CssMediaAst
      const media = `@media ${mediaRule.media ?? ''}`.trim()
      const mediaIsValid = validateMedia(mediaRule, state, isTemplate)
      if (!mediaIsValid && state.mode === 'build') continue
      for (const child of mediaRule.rules ?? []) {
        if (child.type !== 'rule') continue
        compileRuleList(child.selectors ?? [], child.declarations ?? [], media, rules, rootVariables, themeVariables, state, orderRef(() => order++), isTemplate, exports, options.target)
      }
      continue
    }

    if (rule.type === 'keyframes') {
      const keyframesRule = rule as CssKeyframesAst
      const name = keyframesRule.name
      if (!name) continue
      keyframes[name] = compileKeyframes(keyframesRule, state, orderRef(() => order++), isTemplate, options.target)
      continue
    }

    if (rule.type === 'custom-media') {
      compileCustomMedia(rule as CssCustomMediaAst, customMedia, state, isTemplate)
      continue
    }

    if (rule.type !== 'comment') {
      addDiagnostic(state, diagnostic(
        'UNSUPPORTED_AT_RULE',
        `Unsupported at-rule or CSS rule type "${rule.type}" ignored.`,
        'warning',
        positionOf(rule)
      ))
    }
  }

  const metadata = buildMetadata(rules, keyframes, rootVariables, themeVariables, customMedia, isTemplate)
  return createSheet({
    id,
    sourceId,
    contentHash,
    rules,
    keyframes,
    rootVariables: Object.keys(rootVariables).length > 0 ? rootVariables : undefined,
    themeVariables: Object.keys(themeVariables).length > 0 ? themeVariables : undefined,
    customMedia: Object.keys(customMedia).length > 0 ? customMedia : undefined,
    exports: Object.keys(exports).length > 0 ? exports : undefined,
    metadata,
    diagnostics: state.diagnostics,
    error: state.diagnostics.find(item => item.level === 'error')
  })
}

function compileRuleList (
  selectors: string[],
  declarations: CssDeclarationAst[],
  media: string | null,
  output: CssxRule[],
  rootVariables: Record<string, string>,
  themeVariables: Record<string, Record<string, string>>,
  state: CompileState,
  nextOrder: () => number,
  isTemplate: boolean,
  exports: Record<string, string>,
  target: CssxTarget | undefined
): void {
  let compiledDeclarations: CssxDeclaration[] | undefined

  for (const selector of selectors) {
    if (selector === ':export') {
      compileExports(declarations, exports, state, isTemplate)
      continue
    }

    if (selector.trim() === ':root') {
      if (media != null) {
        addDiagnostic(state, diagnostic(
          'UNSUPPORTED_SELECTOR',
          `Unsupported selector "${selector}" inside media query ignored. CSSX provider root variables are unconditional.`,
          'warning'
        ))
        continue
      }
      compileRootVariables(declarations, rootVariables, state, ':root')
      continue
    }

    const themeMatch = selector.trim().match(THEME_ROOT_SELECTOR_RE)
    if (themeMatch) {
      if (media != null) {
        addDiagnostic(state, diagnostic(
          'UNSUPPORTED_SELECTOR',
          `Unsupported selector "${selector}" inside media query ignored. CSSX provider theme variables are unconditional.`,
          'warning'
        ))
        continue
      }
      const themeName = themeMatch[1]
      themeVariables[themeName] ??= {}
      compileRootVariables(declarations, themeVariables[themeName], state, selector.trim())
      continue
    }

    if (selector.trim().startsWith(':root')) {
      addDiagnostic(state, diagnostic(
        'UNSUPPORTED_SELECTOR',
        `Unsupported selector "${selector}" ignored. CSSX supports only :root and :root.<theme> for provider CSS variables.`,
        'warning'
      ))
      continue
    }

    const parsed = parseSelector(selector, positionOfDeclarationList(declarations))
    if (parsed.diagnostic) {
      addDiagnostic(state, parsed.diagnostic)
      continue
    }
    if (!parsed.result) continue
    compiledDeclarations ??= compileDeclarations(declarations, state, isTemplate, target)

    output.push({
      selector: parsed.result.selector,
      tag: parsed.result.tag,
      classes: parsed.result.classes,
      part: parsed.result.part,
      specificity: parsed.result.specificity,
      order: nextOrder(),
      media,
      declarations: compiledDeclarations
    })
  }
}

function compileRootVariables (
  declarations: CssDeclarationAst[],
  rootVariables: Record<string, string>,
  state: CompileState,
  selector: string
): void {
  for (const declaration of declarations) {
    if (declaration.type !== 'declaration') continue
    const property = declaration.property
    if (!property) continue

    if (!VAR_NAME_RE.test(property)) {
      addDiagnostic(state, diagnostic(
        'INVALID_THEME_BLOCK',
        `Only CSS custom properties are supported inside ${selector}. Declaration "${property}" ignored.`,
        'warning',
        positionOf(declaration)
      ))
      continue
    }

    const value = declaration.value ?? ''
    rootVariables[property] = value
  }
}

function compileExports (
  declarations: CssDeclarationAst[],
  exports: Record<string, string>,
  state: CompileState,
  isTemplate: boolean
): void {
  for (const declaration of declarations) {
    if (declaration.type !== 'declaration') continue
    if (isTemplate && hasDynamicSlots(declaration.value ?? '')) {
      addDiagnostic(state, diagnostic(
        'UNSUPPORTED_INTERPOLATION_POSITION',
        'Interpolation is not supported inside :export blocks.',
        'error',
        positionOf(declaration)
      ))
      continue
    }
    if (declaration.property) exports[declaration.property] = declaration.value ?? ''
  }
}

function compileCustomMedia (
  rule: CssCustomMediaAst,
  customMedia: Record<string, string>,
  state: CompileState,
  isTemplate: boolean
): void {
  const name = rule.name ?? ''
  const media = rule.media ?? ''

  if (!CUSTOM_MEDIA_NAME_RE.test(name)) {
    addDiagnostic(state, diagnostic(
      'INVALID_CUSTOM_MEDIA',
      `Invalid @custom-media name "${name}". Custom media names must start with "--".`,
      'warning',
      positionOf(rule)
    ))
    return
  }

  if (THEME_CUSTOM_MEDIA_NAME_RE.test(name)) {
    addDiagnostic(state, diagnostic(
      'INVALID_CUSTOM_MEDIA',
      `Custom media name "${name}" is reserved by CSSX theme media aliases.`,
      'warning',
      positionOf(rule)
    ))
    return
  }

  if (isTemplate && hasDynamicSlots(media)) {
    addDiagnostic(state, diagnostic(
      'UNSUPPORTED_INTERPOLATION_POSITION',
      'Interpolation is not supported inside @custom-media queries.',
      'error',
      positionOf(rule)
    ))
    return
  }

  customMedia[name] = media.trim()
}

function compileDeclarations (
  declarations: CssDeclarationAst[],
  state: CompileState,
  isTemplate: boolean,
  target: CssxTarget | undefined
): CssxDeclaration[] {
  const output: CssxDeclaration[] = []
  let order = 0

  for (const declaration of declarations) {
    if (declaration.type !== 'declaration') continue
    const property = declaration.property
    const value = declaration.value ?? ''
    if (!property) continue

    if (property.startsWith('--')) {
      addDiagnostic(state, diagnostic(
        'INVALID_DECLARATION',
        `CSS custom property declaration "${property}" ignored. Use variables or setDefaultVariables() instead.`,
        'warning',
        positionOf(declaration)
      ))
      continue
    }

    const dynamicSlots = isTemplate ? getDynamicSlots(value) : undefined
    const compiledDeclaration: CssxDeclaration = {
      property,
      value,
      raw: `${property}: ${value}`,
      order: order++,
      dynamicSlots,
      line: declaration.position?.start?.line,
      column: declaration.position?.start?.column
    }

    validateBuildDeclaration(compiledDeclaration, state, target)
    output.push(compiledDeclaration)
  }

  return output
}

function compileKeyframes (
  rule: CssKeyframesAst,
  state: CompileState,
  nextOrder: () => number,
  isTemplate: boolean,
  target: CssxTarget | undefined
): CssxKeyframe[] {
  const output: CssxKeyframe[] = []
  for (const frame of rule.keyframes ?? []) {
    output.push({
      selector: (frame.values ?? []).join(', '),
      declarations: compileDeclarations(frame.declarations ?? [], state, isTemplate, target),
      order: nextOrder()
    })
  }
  return output
}

function validateBuildDeclaration (
  declaration: CssxDeclaration,
  state: CompileState,
  target: CssxTarget | undefined
): void {
  if (state.mode !== 'build') return

  if (
    declaration.dynamicSlots?.length ||
    declaration.value.includes('var(')
  ) {
    return
  }

  const position = {
    line: declaration.line,
    column: declaration.column
  }
  const resolved = resolveCssValue(declaration.value, {
    dimensions: {
      width: 100,
      height: 100
    },
    deprecateUUnits: true
  })

  if (resolved.valid) {
    for (const item of resolved.diagnostics) {
      addDiagnostic(state, diagnostic(
        item.code,
        item.message,
        item.level,
        position
      ))
    }
  }

  if (!resolved.valid) {
    for (const item of resolved.diagnostics) {
      addDiagnostic(state, diagnostic(
        item.code,
        item.message,
        'error',
        position
      ))
    }
    return
  }

  const transformed = transformDeclarations([{
    property: declaration.property,
    value: resolved.value,
    raw: `${declaration.property}: ${resolved.value}`,
    order: declaration.order
  }], {
    platform: target ?? 'react-native'
  })

  for (const item of transformed.diagnostics) {
    addDiagnostic(state, diagnostic(
      item.code,
      item.message,
      'error',
      position
    ))
  }
}

function validateMedia (
  rule: CssMediaAst,
  state: CompileState,
  isTemplate: boolean
): boolean {
  if (isTemplate && hasDynamicSlots(rule.media ?? '')) {
    addDiagnostic(state, diagnostic(
      'UNSUPPORTED_INTERPOLATION_POSITION',
      'Interpolation is not supported inside media queries.',
      'error',
      positionOf(rule)
    ))
    return false
  }

  try {
    if (THEME_MEDIA_RE.test(rule.media ?? '') || MEDIA_RANGE_RE.test(rule.media ?? '')) return true
    mediaQuery.parse(rule.media ?? '')
    return true
  } catch (error) {
    addDiagnostic(state, diagnostic(
      'UNSUPPORTED_AT_RULE',
      `Unsupported media query "${rule.media ?? ''}" ignored: ${(error as Error).message}`,
      'warning',
      positionOf(rule)
    ))
    return false
  }
}

function buildMetadata (
  rules: CssxRule[],
  keyframes: Record<string, CssxKeyframe[]>,
  rootVariables: Record<string, string>,
  themeVariables: Record<string, Record<string, string>>,
  customMedia: Record<string, string>,
  isTemplate: boolean
): CssxMetadata {
  const vars = new Set<string>()
  let hasMedia = false
  let hasViewportUnits = false
  let hasAnimations = Object.keys(keyframes).length > 0
  let hasTransitions = false
  let hasInterpolations = isTemplate

  for (const rule of rules) {
    if (rule.media) hasMedia = true
    scanDeclarations(rule.declarations)
  }
  for (const frames of Object.values(keyframes)) {
    for (const frame of frames) scanDeclarations(frame.declarations)
  }
  for (const value of Object.values(rootVariables)) {
    collectVars(value, vars)
    if (VIEWPORT_UNIT_RE.test(value)) hasViewportUnits = true
  }
  for (const variables of Object.values(themeVariables)) {
    for (const value of Object.values(variables)) {
      collectVars(value, vars)
      if (VIEWPORT_UNIT_RE.test(value)) hasViewportUnits = true
    }
  }
  for (const value of Object.values(customMedia)) collectVars(value, vars)

  function scanDeclarations (declarations: CssxDeclaration[]): void {
    for (const declaration of declarations) {
      collectVars(declaration.value, vars)
      if (VIEWPORT_UNIT_RE.test(declaration.value)) hasViewportUnits = true
      if (ANIMATION_PROPS.has(declaration.property)) hasAnimations = true
      if (TRANSITION_PROPS.has(declaration.property)) hasTransitions = true
      if (declaration.dynamicSlots && declaration.dynamicSlots.length > 0) hasInterpolations = true
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
    hasTransitions,
    hasThemes: Object.keys(themeVariables).length > 0,
    hasCustomMedia: Object.keys(customMedia).length > 0
  }
}

function collectVars (value: string, vars: Set<string>): void {
  const parsed = valueParser(value)
  parsed.walk(node => {
    if (node.type !== 'function' || node.value !== 'var') return
    const first = node.nodes.find(child => child.type === 'word')
    if (first?.value && VAR_RE.test(`var(${first.value})`)) vars.add(first.value)
  })
}

function getDynamicSlots (value: string): number[] | undefined {
  const slots: number[] = []
  DYNAMIC_SLOT_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = DYNAMIC_SLOT_RE.exec(value)) != null) {
    slots.push(Number(match[1]))
  }
  return slots.length > 0 ? slots : undefined
}

function hasDynamicSlots (value: string): boolean {
  DYNAMIC_SLOT_RE.lastIndex = 0
  return DYNAMIC_SLOT_RE.test(value)
}

function createSheet (input: Partial<CompiledCssSheet> & {
  id: string
  contentHash: string
  diagnostics: CssxDiagnostic[]
}): CompiledCssSheet {
  return {
    version: 1,
    id: input.id,
    sourceId: input.sourceId,
    contentHash: input.contentHash,
    rules: input.rules ?? [],
    keyframes: input.keyframes ?? {},
    rootVariables: input.rootVariables,
    themeVariables: input.themeVariables,
    customMedia: input.customMedia,
    exports: input.exports,
    metadata: input.metadata ?? {
      hasVars: false,
      vars: [],
      hasMedia: false,
      hasViewportUnits: false,
      hasInterpolations: false,
      hasDynamicRuntimeDependencies: false,
      hasAnimations: false,
      hasTransitions: false,
      hasThemes: false,
      hasCustomMedia: false
    },
    diagnostics: input.diagnostics,
    error: input.error
  }
}

function orderRef (next: () => number): () => number {
  return next
}

function positionOf (node: CssPositioned): { line?: number, column?: number } {
  return {
    line: node.position?.start?.line,
    column: node.position?.start?.column
  }
}

function positionOfDeclarationList (declarations: CssDeclarationAst[]): { line?: number, column?: number } | undefined {
  const first = declarations.find(item => item.position)
  return first ? positionOf(first) : undefined
}

interface CssAst {
  stylesheet?: {
    rules?: CssRuleAst[]
  }
}

type CssRuleAst = CssStyleRuleAst | CssMediaAst | CssKeyframesAst | CssCustomMediaAst | CssUnsupportedAst

interface CssPositioned {
  position?: {
    start?: {
      line?: number
      column?: number
    }
  }
}

interface CssStyleRuleAst extends CssPositioned {
  type: 'rule'
  selectors?: string[]
  declarations?: CssDeclarationAst[]
}

interface CssMediaAst extends CssPositioned {
  type: 'media'
  media?: string
  rules?: CssStyleRuleAst[]
}

interface CssKeyframesAst extends CssPositioned {
  type: 'keyframes'
  name?: string
  keyframes?: Array<CssPositioned & {
    type: 'keyframe'
    values?: string[]
    declarations?: CssDeclarationAst[]
  }>
}

interface CssCustomMediaAst extends CssPositioned {
  type: 'custom-media'
  name?: string
  media?: string
}

interface CssDeclarationAst extends CssPositioned {
  type: 'declaration' | string
  property?: string
  value?: string
}

interface CssUnsupportedAst extends CssPositioned {
  type: string
}
