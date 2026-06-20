import { useEffect, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { compileCss } from '../compiler.js'
import { useCssxConfig } from './config.js'
import { TrackedCssxSheet } from './tracker.js'
const useCommitEffect = typeof window === 'undefined'
  ? useEffect
  : useLayoutEffect
export function useCssxSheet (sheet, options = {}) {
  const context = useCssxConfig()
  const trackerRef = useRef(null)
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
  useSyncExternalStore(tracker.subscribe, tracker.getSnapshot, tracker.getServerSnapshot)
  useCommitEffect(() => {
    tracker.commitRender(renderDependencies)
  })
  return tracker
}
export function useCompiledCss (input, options = {}) {
  const context = useCssxConfig()
  const target = options.target ?? context.target
  const sheet = useMemo(() => {
    if (typeof input !== 'string') { return input }
    return compileCss(input, { target })
  }, [input, target])
  return useCssxSheet(sheet, options)
}
export function useCssxTemplate (sheet, values, options = {}) {
  return useCssxSheet(sheet, {
    ...options,
    values
  })
}
export function useCssxLayer (input, options = {}) {
  if (!input) { return input }
  if (typeof input === 'string') { return useCompiledCss(input, options) }
  if (input instanceof TrackedCssxSheet) { return input }
  if (isCompiledSheet(input)) { return useCssxSheet(input, options) }
  if (isLayerObject(input)) {
    const sheet = input.sheet
    if (typeof sheet === 'string') {
      return {
        ...input,
        sheet: useCompiledCss(sheet, options)
      }
    }
    if (sheet instanceof TrackedCssxSheet) { return input }
    if (isCompiledSheet(sheet)) {
      return useCssxSheet(sheet, {
        ...options,
        values: input.values
      })
    }
  }
  return input
}
function isCompiledSheet (value) {
  return Boolean(value &&
        typeof value === 'object' &&
        value.version === 1 &&
        Array.isArray(value.rules))
}
function isLayerObject (value) {
  return Boolean(value &&
        typeof value === 'object' &&
        'sheet' in value)
}
