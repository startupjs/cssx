import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore
} from 'react'
import { compileCss } from '../compiler.ts'
import { isCssColor } from '../colors.ts'
import { evaluateCssxMediaQuery } from '../resolve.ts'
import type { CompiledCssSheet } from '../types.ts'
import {
  useCssxConfig,
  useCssxRuntimeContext,
  type CssxReactConfig
} from './config.ts'
import {
  coerceCssValue,
  resolveCssValue,
  type ResolveCssValueResult
} from '../values.ts'
import {
  createDependencySnapshot,
  getDefaultVariableValues,
  getDimensions,
  getDimensionsVersion,
  getMediaQueryEvaluator,
  getRuntimeVersion,
  getVariableValues,
  getVariableVersion,
  retainMediaQuery,
  subscribeRuntimeStore,
  type CssxDependencySnapshot
} from './store.ts'
import { TrackedCssxSheet } from './tracker.ts'
import { DEFAULT_CUSTOM_MEDIA } from './customMedia.ts'

const useCommitEffect = typeof window === 'undefined'
  ? useEffect
  : useLayoutEffect
const CSS_VARIABLE_NAME_RE = /^--[A-Za-z0-9_-]+$/
const CSS_COLOR_FUNCTION_RE = /^(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\(/i
const CSS_COLOR_TOKEN_RE = /^[A-Za-z][A-Za-z0-9_-]*$/
const EMPTY_METADATA = {
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
}
const EMPTY_LAYER_SHEET: CompiledCssSheet = {
  version: 1,
  id: 'cssx_empty_layer',
  contentHash: 'cssx_empty_layer',
  rules: [],
  keyframes: {},
  metadata: EMPTY_METADATA,
  diagnostics: []
}

export type CssxLayerHookInput =
  | string
  | CompiledCssSheet
  | TrackedCssxSheet
  | {
    sheet: string | CompiledCssSheet | TrackedCssxSheet
    values?: readonly unknown[]
  }
  | null
  | undefined
  | false

export type CssxLayerHookOutput =
  | string
  | TrackedCssxSheet
  | {
    sheet: string | TrackedCssxSheet
    values?: readonly unknown[]
  }
  | null
  | undefined
  | false

export type CssColorMixInput =
  | number
  | string
  | {
    mix?: number | string
    with?: string
  }

export function useCssxSheet (
  sheet: CompiledCssSheet,
  options: CssxReactConfig = {}
): TrackedCssxSheet {
  const context = useCssxConfig()
  const trackerRef = useRef<TrackedCssxSheet | null>(null)
  const mergedOptions = {
    ...context,
    ...options
  }
  const committedTracker = trackerRef.current
  const tracker = committedTracker?.matches(sheet, mergedOptions)
    ? committedTracker
    : new TrackedCssxSheet(sheet, mergedOptions)
  const renderDependencies = tracker.startRender()

  useSyncExternalStore(
    tracker.subscribe,
    tracker.getSnapshot,
    tracker.getServerSnapshot
  )

  useCommitEffect(() => {
    tracker.commitRender(renderDependencies)
    trackerRef.current = tracker
  })

  return tracker
}

export function useRuntimeCss (
  input: string | CompiledCssSheet,
  options: CssxReactConfig = {}
): TrackedCssxSheet {
  const context = useCssxConfig()
  const target = options.target ?? context.target
  const sheet = useMemo(() => {
    if (typeof input !== 'string') return input
    return compileCss(input, { target })
  }, [input, target])

  return useCssxSheet(sheet, options)
}

export function useCssxTemplate (
  sheet: CompiledCssSheet,
  values: readonly unknown[],
  options: CssxReactConfig = {}
): TrackedCssxSheet {
  return useCssxSheet(sheet, {
    ...options,
    values
  })
}

export function useCssxLayer (
  input: CssxLayerHookInput,
  options: CssxReactConfig = {}
): CssxLayerHookOutput {
  const context = useCssxConfig()
  const target = options.target ?? context.target
  const normalized = useMemo(
    () => normalizeLayerHookInput(input, target),
    [input, target]
  )
  const tracker = useCssxSheet(normalized.sheet, {
    ...options,
    values: normalized.values
  })

  switch (normalized.kind) {
    case 'empty':
      return input as null | undefined | false
    case 'tracked':
      return input as CssxLayerHookOutput
    case 'layerTracked':
      return input as CssxLayerHookOutput
    case 'layerString': {
      const layerInput = input as {
        sheet: string | CompiledCssSheet | TrackedCssxSheet
        values?: readonly unknown[]
      }
      return {
        ...layerInput,
        sheet: tracker
      } as CssxLayerHookOutput
    }
    case 'compiled':
    case 'string':
    case 'layerCompiled':
      return tracker
    case 'unknown':
    default:
      return input as CssxLayerHookOutput
  }
}

export function useCssVariableRaw (
  name: string,
  fallback?: unknown
): string | undefined {
  assertCssVariableName(name)
  const context = useCssxRuntimeContext()
  const committedDependenciesRef = useRef<CssxDependencySnapshot>(createDependencySnapshot())
  const result = resolveCssVariableRaw(name, fallback, context.scopedVariables)
  const renderDependencies = createCssValueDependencySnapshot(result)

  useSyncExternalStore(
    listener => subscribeRuntimeStore(listener, () => committedDependenciesRef.current),
    getRuntimeVersion,
    getRuntimeVersion
  )

  useCommitEffect(() => {
    committedDependenciesRef.current = renderDependencies
  })

  return result.value
}

export function useCssVariable (
  name: string,
  fallback?: unknown
): unknown {
  const value = useCssVariableRaw(name, fallback)
  return value == null ? value : coerceCssValue(value)
}

export function useCssColor (
  color: string,
  mix?: CssColorMixInput
): string | undefined {
  const context = useCssxRuntimeContext()
  const committedDependenciesRef = useRef<CssxDependencySnapshot>(createDependencySnapshot())
  const result = resolveCssColor(color, mix, context.scopedVariables)
  const renderDependencies = createCssValueDependencySnapshot(result)

  useSyncExternalStore(
    listener => subscribeRuntimeStore(listener, () => committedDependenciesRef.current),
    getRuntimeVersion,
    getRuntimeVersion
  )

  useCommitEffect(() => {
    committedDependenciesRef.current = renderDependencies
  })

  return result.value
}

export function getCssVariableRaw (
  name: string,
  fallback?: unknown
): string | undefined {
  assertCssVariableName(name)
  return resolveCssVariableRaw(name, fallback).value
}

export function getCssVariable (
  name: string,
  fallback?: unknown
): unknown {
  const value = getCssVariableRaw(name, fallback)
  return value == null ? value : coerceCssValue(value)
}

export function getCssColor (
  color: string,
  mix?: CssColorMixInput
): string | undefined {
  return resolveCssColor(color, mix).value
}

export function useMedia (): Record<string, boolean> {
  const context = useCssxRuntimeContext()
  const committedDependenciesRef = useRef<CssxDependencySnapshot>(createDependencySnapshot())
  const mediaQueryReleasesRef = useRef<Map<string, () => void>>(new Map())
  const media = {
    ...DEFAULT_CUSTOM_MEDIA,
    ...context.customMedia
  }
  const result = resolveMedia(media, context)
  const renderDependencies = createMediaDependencySnapshot(result)

  useSyncExternalStore(
    listener => subscribeRuntimeStore(listener, () => committedDependenciesRef.current),
    getRuntimeVersion,
    getRuntimeVersion
  )

  useCommitEffect(() => {
    committedDependenciesRef.current = renderDependencies
    syncMediaQuerySubscriptions(mediaQueryReleasesRef.current, renderDependencies)
    return () => {
      releaseMediaQuerySubscriptions(mediaQueryReleasesRef.current)
    }
  })

  return result.value
}

function isCompiledSheet (value: unknown): value is CompiledCssSheet {
  return Boolean(
    value &&
    typeof value === 'object' &&
    (value as { version?: unknown }).version === 1 &&
    Array.isArray((value as { rules?: unknown }).rules)
  )
}

function isLayerObject (value: unknown): value is {
  sheet: string | CompiledCssSheet | TrackedCssxSheet
  values?: readonly unknown[]
} {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'sheet' in value
  )
}

type NormalizedLayerHookInput =
  | {
    kind: 'empty' | 'unknown' | 'tracked' | 'layerTracked'
    sheet: CompiledCssSheet
    values?: readonly unknown[]
  }
  | {
    kind: 'string' | 'compiled' | 'layerString' | 'layerCompiled'
    sheet: CompiledCssSheet
    values?: readonly unknown[]
  }

function normalizeLayerHookInput (
  input: CssxLayerHookInput,
  target: CssxReactConfig['target']
): NormalizedLayerHookInput {
  if (!input) {
    return {
      kind: 'empty',
      sheet: EMPTY_LAYER_SHEET
    }
  }

  if (typeof input === 'string') {
    return {
      kind: 'string',
      sheet: compileCss(input, { target })
    }
  }

  if (input instanceof TrackedCssxSheet) {
    return {
      kind: 'tracked',
      sheet: EMPTY_LAYER_SHEET
    }
  }

  if (isCompiledSheet(input)) {
    return {
      kind: 'compiled',
      sheet: input
    }
  }

  if (isLayerObject(input)) {
    const sheet = input.sheet
    if (typeof sheet === 'string') {
      return {
        kind: 'layerString',
        sheet: compileCss(sheet, { target }),
        values: input.values
      }
    }
    if (sheet instanceof TrackedCssxSheet) {
      return {
        kind: 'layerTracked',
        sheet: EMPTY_LAYER_SHEET
      }
    }
    if (isCompiledSheet(sheet)) {
      return {
        kind: 'layerCompiled',
        sheet,
        values: input.values
      }
    }
  }

  return {
    kind: 'unknown',
    sheet: EMPTY_LAYER_SHEET
  }
}

function resolveCssVariableRaw (
  name: string,
  fallback?: unknown,
  scopedVariables?: readonly Record<string, unknown>[]
) {
  const fallbackText = fallback == null ? '' : `, ${String(fallback)}`
  return resolveCssValue(`var(${name}${fallbackText})`, {
    variables: getVariableValues(),
    scopedVariables,
    defaultVariables: getDefaultVariableValues(),
    dimensions: getDimensions()
  })
}

function resolveCssColor (
  color: string,
  mix?: CssColorMixInput,
  scopedVariables?: readonly Record<string, unknown>[]
): ResolveCssValueResult {
  return resolveCssValue(createCssColorExpression(color, mix), {
    variables: getVariableValues(),
    scopedVariables,
    defaultVariables: getDefaultVariableValues(),
    dimensions: getDimensions()
  })
}

function createCssValueDependencySnapshot (
  result: ResolveCssValueResult
): CssxDependencySnapshot {
  const dependencies = createDependencySnapshot()
  for (const name of result.dependencies.vars) {
    dependencies.vars.set(name, getVariableVersion(name))
  }
  if (result.dependencies.dimensions) {
    dependencies.dimensionsVersion = getDimensionsVersion()
  }
  return dependencies
}

function createCssColorExpression (
  color: string,
  mix?: CssColorMixInput
): string {
  const base = normalizeCssColorExpression(color)
  const mixOptions = normalizeColorMix(mix)
  if (mixOptions == null) return base

  return `color-mix(in srgb, ${base} ${mixOptions.weight}, ${normalizeCssColorExpression(mixOptions.with)})`
}

function normalizeCssColorExpression (input: string): string {
  const value = input.trim()
  if (value === '') return value
  if (/^var\(/i.test(value)) return value
  if (value.startsWith('--')) {
    throw new TypeError(`Ambiguous CSS color token "${input}". Use "var(${value})" or a semantic token such as "primary".`)
  }
  if (
    CSS_COLOR_FUNCTION_RE.test(value) ||
    isCssColor(value) ||
    !CSS_COLOR_TOKEN_RE.test(value)
  ) {
    return value
  }

  return `var(--color-${value})`
}

function normalizeColorMix (
  input: CssColorMixInput | undefined
): { weight: string, with: string } | null {
  if (input == null) return null
  if (typeof input === 'number' || typeof input === 'string') {
    return {
      weight: normalizeMixWeight(input),
      with: 'transparent'
    }
  }

  if (input.mix == null) return null
  return {
    weight: normalizeMixWeight(input.mix),
    with: input.with ?? 'transparent'
  }
}

function normalizeMixWeight (input: number | string): string {
  if (typeof input === 'string') {
    const value = input.trim()
    if (/^(?:\d+|\d*\.\d+)%$/.test(value)) return value
    throw new TypeError(`Invalid CSS color mix weight "${input}". Expected a percentage string such as "15%".`)
  }

  if (!Number.isFinite(input) || input < 0 || input > 1) {
    throw new TypeError(`Invalid CSS color mix weight "${input}". Expected a number from 0 to 1.`)
  }

  return `${input * 100}%`
}

function resolveMedia (
  media: Record<string, string>,
  context: ReturnType<typeof useCssxRuntimeContext>
): {
    value: Record<string, boolean>
    dependencies: {
      vars: string[]
      dimensions: boolean
      media: Record<string, boolean>
    }
  } {
  const value: Record<string, boolean> = {}
  const vars = new Set<string>()
  let dimensions = false
  const mediaDependencies: Record<string, boolean> = {}

  for (const [name, query] of Object.entries(media)) {
    const result = evaluateCssxMediaQuery(query, {
      variables: getVariableValues(),
      scopedVariables: context.scopedVariables,
      defaultVariables: getDefaultVariableValues(),
      customMedia: media,
      dimensions: getDimensions(),
      mediaQueryEvaluator: getMediaQueryEvaluator(),
      theme: context.theme
    })
    value[normalizeMediaName(name)] = result.matches
    for (const varName of result.dependencies.vars) vars.add(varName)
    if (result.dependencies.dimensions) dimensions = true
    mediaDependencies[query] = result.matches
  }

  return {
    value,
    dependencies: {
      vars: Array.from(vars),
      dimensions,
      media: mediaDependencies
    }
  }
}

function createMediaDependencySnapshot (
  result: ReturnType<typeof resolveMedia>
): CssxDependencySnapshot {
  const dependencies = createDependencySnapshot()
  for (const name of result.dependencies.vars) {
    dependencies.vars.set(name, getVariableVersion(name))
  }
  dependencies.dimensionsVersion = getDimensionsVersion()
  for (const [query, matches] of Object.entries(result.dependencies.media)) {
    dependencies.media.set(query, matches)
  }
  return dependencies
}

function normalizeMediaName (name: string): string {
  const trimmed = name.replace(/^--/, '').replace(/^breakpoint-/, '')
  return trimmed.replace(/-([a-z0-9])/g, (_match, character: string) => character.toUpperCase())
}

function syncMediaQuerySubscriptions (
  releases: Map<string, () => void>,
  dependencies: CssxDependencySnapshot
): void {
  const nextQueries = new Set(dependencies.media.keys())
  for (const [query, release] of Array.from(releases)) {
    if (nextQueries.has(query)) continue
    release()
    releases.delete(query)
  }

  for (const query of nextQueries) {
    if (releases.has(query)) continue
    releases.set(query, retainMediaQuery(query))
  }
}

function releaseMediaQuerySubscriptions (
  releases: Map<string, () => void>
): void {
  for (const release of releases.values()) release()
  releases.clear()
}

function assertCssVariableName (name: string): void {
  if (CSS_VARIABLE_NAME_RE.test(name)) return
  throw new TypeError(`Invalid CSS custom property name "${name}". CSSX variables must start with "--".`)
}
