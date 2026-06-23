/// <reference path="./vendor.d.ts" />

export {
  compileCss,
  compileCssTemplate
} from './compiler.ts'
export {
  resolveCssValue
} from './values.ts'
export {
  u
} from './units.ts'
import {
  resetUWarningForTests
} from './units.ts'
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
  configureColorSchemeAdapter,
  configureDimensionsAdapter,
  configureMediaQueryAdapter,
  defaultVariables,
  flushMicrotasksForTests,
  getRuntimeSubscriberCountForTests,
  resetStoreForTests,
  setColorSchemeForTests,
  setDefaultVariables,
  setDimensionsForTests,
  subscribeVariablesForTests,
  variables
} from './react/store.ts'
// @ts-ignore react-native is an optional peer for non-RN consumers.
import { Dimensions } from 'react-native'
// @ts-ignore react-native is an optional peer for non-RN consumers.
import { Appearance } from 'react-native'

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
  CssxProviderStyleInput,
  CssxProviderStyleLayer,
  CssxProviderProps,
  CssxReactConfig,
  CssxRuntimeContextValue
} from './react/config.ts'
export type {
  TrackedCssxSheetOptions
} from './react/tracker.ts'
export type {
  CssxColorSchemeAdapter,
  CssxVariableStore
} from './react/store.ts'

export {
  CssxProvider,
  configureCssx,
  themed,
  useCssxComponentTag,
  useCssxConfig,
  useCssxRuntimeContext
} from './react/config.ts'
export {
  getCssColor,
  getCssVariable,
  getCssVariableRaw,
  useMedia,
  useCssColor,
  useCssVariable,
  useCssVariableRaw
} from './react/hooks.ts'
export type {
  CssColorMixInput
} from './react/hooks.ts'
export {
  TrackedCssxSheet,
  isTrackedCssxSheet
} from './react/tracker.ts'
export {
  defaultVariables,
  setDefaultVariables,
  variables
}

installReactNativeColorSchemeAdapter()
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
  configureColorSchemeAdapterForTests: configureColorSchemeAdapter,
  configureDimensionsAdapterForTests: configureDimensionsAdapter,
  configureMediaQueryAdapterForTests: configureMediaQueryAdapter,
  createTrackedCssxSheet,
  flushMicrotasksForTests,
  getRuntimeSubscriberCountForTests,
  resetStoreForTests,
  resetUWarningForTests,
  setColorSchemeForTests,
  setDimensionsForTests,
  subscribeVariablesForTests
}

function installReactNativeColorSchemeAdapter (): void {
  configureColorSchemeAdapter({
    get: () => Appearance.getColorScheme(),
    subscribe: listener => {
      const subscription = Appearance.addChangeListener(listener)
      return () => {
        subscription.remove()
      }
    }
  })
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
