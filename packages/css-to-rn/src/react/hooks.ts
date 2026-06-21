import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore
} from 'react'
import { compileCss } from '../compiler.ts'
import type { CompiledCssSheet } from '../types.ts'
import {
  useCssxConfig,
  useCssxRuntimeContext,
  type CssxReactConfig
} from './config.ts'
import {
  coerceCssValue,
  resolveCssValue
} from '../values.ts'
import {
  createDependencySnapshot,
  getDefaultVariableValues,
  getDimensions,
  getDimensionsVersion,
  getRuntimeVersion,
  getVariableValues,
  getVariableVersion,
  subscribeRuntimeStore,
  type CssxDependencySnapshot
} from './store.ts'
import { TrackedCssxSheet } from './tracker.ts'

const useCommitEffect = typeof window === 'undefined'
  ? useEffect
  : useLayoutEffect
const CSS_VARIABLE_NAME_RE = /^--[A-Za-z0-9_-]+$/
const EMPTY_METADATA = {
  hasVars: false,
  vars: [],
  hasMedia: false,
  hasViewportUnits: false,
  hasInterpolations: false,
  hasDynamicRuntimeDependencies: false,
  hasAnimations: false,
  hasTransitions: false
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
  const renderDependencies = createVariableDependencySnapshot(result)

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

function createVariableDependencySnapshot (
  result: ReturnType<typeof resolveCssVariableRaw>
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

function assertCssVariableName (name: string): void {
  if (CSS_VARIABLE_NAME_RE.test(name)) return
  throw new TypeError(`Invalid CSS custom property name "${name}". CSSX variables must start with "--".`)
}
