export { compileCss, compileCssTemplate } from './compiler.js'
export { resolveCssValue } from './values.js'
import { cssx as baseCssx, clearRawCssCacheForTests } from './react/cssx.js'
import { useCssxLayer as baseUseCssxLayer, useCompiledCss as baseUseCompiledCss, useCssxSheet as baseUseCssxSheet, useCssxTemplate as baseUseCssxTemplate } from './react/hooks.js'
import { createTrackedCssxSheet } from './react/tracker.js'
import { configureDimensionsAdapter, defaultVariables, flushMicrotasksForTests, getRuntimeSubscriberCountForTests, resetStoreForTests, setDefaultVariables, setDimensionsForTests, subscribeVariablesForTests, variables } from './react/store.js'
export { CssxProvider, configureCssx, useCssxConfig } from './react/config.js'
export { TrackedCssxSheet, isTrackedCssxSheet } from './react/tracker.js'
export { defaultVariables, setDefaultVariables, variables }
export function cssx (...args) {
  const [styleName, sheet, inlineStyleProps, options] = args
  return baseCssx(styleName, sheet, inlineStyleProps, {
    target: 'web',
    ...(options ?? {})
  })
}
export function useCompiledCss (...args) {
  const [input, options] = args
  return baseUseCompiledCss(input, {
    target: 'web',
    ...(options ?? {})
  })
}
export function useCssxLayer (...args) {
  const [input, options] = args
  return baseUseCssxLayer(input, {
    target: 'web',
    ...(options ?? {})
  })
}
export function useCssxSheet (...args) {
  const [sheet, options] = args
  return baseUseCssxSheet(sheet, {
    target: 'web',
    ...(options ?? {})
  })
}
export function useCssxTemplate (...args) {
  const [sheet, values, options] = args
  return baseUseCssxTemplate(sheet, values, {
    target: 'web',
    ...(options ?? {})
  })
}
export const __cssxInternals = {
  clearRawCssCacheForTests,
  configureDimensionsAdapterForTests: configureDimensionsAdapter,
  createTrackedCssxSheet,
  flushMicrotasksForTests,
  getRuntimeSubscriberCountForTests,
  resetStoreForTests,
  setDimensionsForTests,
  subscribeVariablesForTests
}
