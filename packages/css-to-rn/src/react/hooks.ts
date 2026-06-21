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

  if (trackerRef.current == null) {
    trackerRef.current = new TrackedCssxSheet(sheet, mergedOptions)
  } else {
    trackerRef.current.update(sheet, mergedOptions)
  }

  const tracker = trackerRef.current
  const renderDependencies = tracker.startRender()

  useSyncExternalStore(
    tracker.subscribe,
    tracker.getSnapshot,
    tracker.getServerSnapshot
  )

  useCommitEffect(() => {
    tracker.commitRender(renderDependencies)
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
  if (!input) return input

  if (typeof input === 'string') return useRuntimeCss(input, options)
  if (input instanceof TrackedCssxSheet) return input
  if (isCompiledSheet(input)) return useCssxSheet(input, options)

  if (isLayerObject(input)) {
    const sheet = input.sheet
    if (typeof sheet === 'string') {
      return {
        ...input,
        sheet: useRuntimeCss(sheet, options)
      }
    }
    if (sheet instanceof TrackedCssxSheet) return input as CssxLayerHookOutput
    if (isCompiledSheet(sheet)) {
      return useCssxSheet(sheet, {
        ...options,
        values: input.values
      })
    }
  }

  return input as CssxLayerHookOutput
}

export function useCssVariableRaw (
  name: string,
  fallback?: unknown
): string | undefined {
  assertCssVariableName(name)
  const context = useCssxRuntimeContext()
  const dependenciesRef = useRef<CssxDependencySnapshot>(createDependencySnapshot())
  const result = resolveCssVariableRaw(name, fallback, context.scopedVariables)
  dependenciesRef.current = createVariableDependencySnapshot(result)

  useSyncExternalStore(
    listener => subscribeRuntimeStore(listener, () => dependenciesRef.current),
    getRuntimeVersion,
    getRuntimeVersion
  )

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
