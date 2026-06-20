export {
  compileCss,
  compileCssTemplate
} from './compiler.ts'
export {
  resolveCssValue
} from './values.ts'
import {
  cssx as baseCssx,
  clearRawCssCacheForTests
} from './react/cssx.ts'
import {
  useCssxLayer as baseUseCssxLayer,
  useRuntimeCss as baseUseRuntimeCss,
  useCssxSheet as baseUseCssxSheet,
  useCssxTemplate as baseUseCssxTemplate
} from './react/hooks.ts'
import {
  createTrackedCssxSheet
} from './react/tracker.ts'
import {
  configureDimensionsAdapter,
  configureMediaQueryAdapter,
  defaultVariables,
  flushMicrotasksForTests,
  getRuntimeSubscriberCountForTests,
  resetStoreForTests,
  setDefaultVariables,
  setDimensionsForTests,
  subscribeVariablesForTests,
  variables
} from './react/store.ts'
import { Dimensions } from 'react-native'

export type {
  CompileCssOptions,
  CompileCssTemplateOptions,
  CompiledCssSheet
} from './types.ts'
export type {
  CssxResolvedProps,
  CssxRuntimeOptions,
  CssxStyleName
} from './react/cssx.ts'
export type {
  CssxProviderProps,
  CssxReactConfig
} from './react/config.ts'
export type {
  TrackedCssxSheetOptions
} from './react/tracker.ts'

export {
  CssxProvider,
  configureCssx,
  useCssxConfig
} from './react/config.ts'
export {
  TrackedCssxSheet,
  isTrackedCssxSheet
} from './react/tracker.ts'
export {
  defaultVariables,
  setDefaultVariables,
  variables
}

installReactNativeDimensionsAdapter()

export function cssx (
  ...args: Parameters<typeof baseCssx>
): ReturnType<typeof baseCssx> {
  const [styleName, sheet, inlineStyleProps, options] = args
  return baseCssx(styleName, sheet, inlineStyleProps, {
    target: 'react-native',
    ...(options ?? {})
  })
}

export function useRuntimeCss (
  ...args: Parameters<typeof baseUseRuntimeCss>
): ReturnType<typeof baseUseRuntimeCss> {
  const [input, options] = args
  return baseUseRuntimeCss(input, {
    target: 'react-native',
    ...(options ?? {})
  })
}

export function useCssxLayer (
  ...args: Parameters<typeof baseUseCssxLayer>
): ReturnType<typeof baseUseCssxLayer> {
  const [input, options] = args
  return baseUseCssxLayer(input, {
    target: 'react-native',
    ...(options ?? {})
  })
}

export function useCssxSheet (
  ...args: Parameters<typeof baseUseCssxSheet>
): ReturnType<typeof baseUseCssxSheet> {
  const [sheet, options] = args
  return baseUseCssxSheet(sheet, {
    target: 'react-native',
    ...(options ?? {})
  })
}

export function useCssxTemplate (
  ...args: Parameters<typeof baseUseCssxTemplate>
): ReturnType<typeof baseUseCssxTemplate> {
  const [sheet, values, options] = args
  return baseUseCssxTemplate(sheet, values, {
    target: 'react-native',
    ...(options ?? {})
  })
}

export const __cssxInternals = {
  clearRawCssCacheForTests,
  configureDimensionsAdapterForTests: configureDimensionsAdapter,
  configureMediaQueryAdapterForTests: configureMediaQueryAdapter,
  createTrackedCssxSheet,
  flushMicrotasksForTests,
  getRuntimeSubscriberCountForTests,
  resetStoreForTests,
  setDimensionsForTests,
  subscribeVariablesForTests
}

function installReactNativeDimensionsAdapter (): void {
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
