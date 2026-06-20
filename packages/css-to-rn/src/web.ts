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
  useCompiledCss as baseUseCompiledCss,
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

export function cssx (
  ...args: Parameters<typeof baseCssx>
): ReturnType<typeof baseCssx> {
  const [styleName, sheet, inlineStyleProps, options] = args
  return baseCssx(styleName, sheet, inlineStyleProps, {
    target: 'web',
    ...(options ?? {})
  })
}

export function useCompiledCss (
  ...args: Parameters<typeof baseUseCompiledCss>
): ReturnType<typeof baseUseCompiledCss> {
  const [input, options] = args
  return baseUseCompiledCss(input, {
    target: 'web',
    ...(options ?? {})
  })
}

export function useCssxLayer (
  ...args: Parameters<typeof baseUseCssxLayer>
): ReturnType<typeof baseUseCssxLayer> {
  const [input, options] = args
  return baseUseCssxLayer(input, {
    target: 'web',
    ...(options ?? {})
  })
}

export function useCssxSheet (
  ...args: Parameters<typeof baseUseCssxSheet>
): ReturnType<typeof baseUseCssxSheet> {
  const [sheet, options] = args
  return baseUseCssxSheet(sheet, {
    target: 'web',
    ...(options ?? {})
  })
}

export function useCssxTemplate (
  ...args: Parameters<typeof baseUseCssxTemplate>
): ReturnType<typeof baseUseCssxTemplate> {
  const [sheet, values, options] = args
  return baseUseCssxTemplate(sheet, values, {
    target: 'web',
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
