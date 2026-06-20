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
  tracker.startRender()

  useSyncExternalStore(
    tracker.subscribe,
    tracker.getSnapshot,
    tracker.getServerSnapshot
  )

  useCommitEffect(() => {
    tracker.commitRender()
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
