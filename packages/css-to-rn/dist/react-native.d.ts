export { compileCss, compileCssTemplate } from './compiler.ts'
export { resolveCssValue } from './values.ts'
import { cssx as baseCssx, clearRawCssCacheForTests } from './react/cssx.ts'
import { useCssxLayer as baseUseCssxLayer, useCompiledCss as baseUseCompiledCss, useCssxSheet as baseUseCssxSheet, useCssxTemplate as baseUseCssxTemplate } from './react/hooks.ts'
import { createTrackedCssxSheet } from './react/tracker.ts'
import { configureDimensionsAdapter, defaultVariables, flushMicrotasksForTests, getRuntimeSubscriberCountForTests, resetStoreForTests, setDefaultVariables, setDimensionsForTests, subscribeVariablesForTests, variables } from './react/store.ts'
export type { CompileCssOptions, CompileCssTemplateOptions, CompiledCssSheet } from './types.ts'
export type { CssxResolvedProps, CssxRuntimeOptions, CssxStyleName } from './react/cssx.ts'
export type { CssxProviderProps, CssxReactConfig } from './react/config.ts'
export type { TrackedCssxSheetOptions } from './react/tracker.ts'
export { CssxProvider, configureCssx, useCssxConfig } from './react/config.ts'
export { TrackedCssxSheet, isTrackedCssxSheet } from './react/tracker.ts'
export { defaultVariables, setDefaultVariables, variables }
export declare function cssx (...args: Parameters<typeof baseCssx>): ReturnType<typeof baseCssx>
export declare function useCompiledCss (...args: Parameters<typeof baseUseCompiledCss>): ReturnType<typeof baseUseCompiledCss>
export declare function useCssxLayer (...args: Parameters<typeof baseUseCssxLayer>): ReturnType<typeof baseUseCssxLayer>
export declare function useCssxSheet (...args: Parameters<typeof baseUseCssxSheet>): ReturnType<typeof baseUseCssxSheet>
export declare function useCssxTemplate (...args: Parameters<typeof baseUseCssxTemplate>): ReturnType<typeof baseUseCssxTemplate>
export declare const __cssxInternals: {
  clearRawCssCacheForTests: typeof clearRawCssCacheForTests;
  configureDimensionsAdapterForTests: typeof configureDimensionsAdapter;
  createTrackedCssxSheet: typeof createTrackedCssxSheet;
  flushMicrotasksForTests: typeof flushMicrotasksForTests;
  getRuntimeSubscriberCountForTests: typeof getRuntimeSubscriberCountForTests;
  resetStoreForTests: typeof resetStoreForTests;
  setDimensionsForTests: typeof setDimensionsForTests;
  subscribeVariablesForTests: typeof subscribeVariablesForTests;
}
