export { compileCss, compileCssTemplate } from './compiler.js'
export { resolveCssValue } from './values.js'
import { cssx as baseCssx, clearRawCssCacheForTests } from './react/cssx.js'
import { useCssxLayer as baseUseCssxLayer, useCompiledCss as baseUseCompiledCss, useCssxSheet as baseUseCssxSheet, useCssxTemplate as baseUseCssxTemplate } from './react/hooks.js'
import { createTrackedCssxSheet } from './react/tracker.js'
import { configureDimensionsAdapter, defaultVariables, flushMicrotasksForTests, getRuntimeSubscriberCountForTests, resetStoreForTests, setDefaultVariables, setDimensionsForTests, subscribeVariablesForTests, variables } from './react/store.js'
import { Dimensions } from 'react-native'
export { CssxProvider, configureCssx, useCssxConfig } from './react/config.js'
export { TrackedCssxSheet, isTrackedCssxSheet } from './react/tracker.js'
export { defaultVariables, setDefaultVariables, variables }
installReactNativeDimensionsAdapter()
export function cssx (...args) {
  const [styleName, sheet, inlineStyleProps, options] = args
  return baseCssx(styleName, sheet, inlineStyleProps, {
    target: 'react-native',
    ...(options ?? {})
  })
}
export function useCompiledCss (...args) {
  const [input, options] = args
  return baseUseCompiledCss(input, {
    target: 'react-native',
    ...(options ?? {})
  })
}
export function useCssxLayer (...args) {
  const [input, options] = args
  return baseUseCssxLayer(input, {
    target: 'react-native',
    ...(options ?? {})
  })
}
export function useCssxSheet (...args) {
  const [sheet, options] = args
  return baseUseCssxSheet(sheet, {
    target: 'react-native',
    ...(options ?? {})
  })
}
export function useCssxTemplate (...args) {
  const [sheet, values, options] = args
  return baseUseCssxTemplate(sheet, values, {
    target: 'react-native',
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
function installReactNativeDimensionsAdapter () {
  configureDimensionsAdapter({
    get: () => {
      const next = Dimensions.get('window')
      return {
        width: next.width,
        height: next.height
      }
    },
    subscribe: listener => {
      const subscription = Dimensions.addEventListener('change', listener)
      return () => {
        subscription.remove()
      }
    }
  })
}
