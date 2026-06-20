import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore
} from 'react'
import { compileCss } from '../compiler.ts'
import type { CompiledCssSheet } from '../types.ts'
import { useCssxConfig, type CssxReactConfig } from './config.ts'
import { TrackedCssxSheet } from './tracker.ts'

const useCommitEffect = typeof window === 'undefined'
  ? useEffect
  : useLayoutEffect

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

export function useCompiledCss (
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

  if (typeof input === 'string') return useCompiledCss(input, options)
  if (input instanceof TrackedCssxSheet) return input
  if (isCompiledSheet(input)) return useCssxSheet(input, options)

  if (isLayerObject(input)) {
    const sheet = input.sheet
    if (typeof sheet === 'string') {
      return {
        ...input,
        sheet: useCompiledCss(sheet, options)
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
