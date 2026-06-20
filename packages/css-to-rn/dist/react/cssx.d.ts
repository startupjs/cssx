import type { CompiledCssSheet, CssxTarget } from '../types.ts'
import { type CssxCache, type InlineStyleInput, type ResolvedStyleProps, type StyleNameValue } from '../resolve.ts'
import { type TrackedCssxSheet } from './tracker.ts'
export type CssxStyleName = StyleNameValue
export type CssxResolvedProps = ResolvedStyleProps
export interface CssxRuntimeOptions {
  target?: CssxTarget;
  values?: readonly unknown[];
  cache?: boolean | CssxCache;
}
export type CssxSheetInput = string | CompiledCssSheet | TrackedCssxSheet | CssxReactLayer | readonly CssxSheetInput[]
export interface CssxReactLayer {
  sheet: string | CompiledCssSheet | TrackedCssxSheet;
  values?: readonly unknown[];
  cacheKey?: unknown;
}
export declare function cssx (styleName: CssxStyleName, sheetInput: CssxSheetInput, inlineStyleProps?: InlineStyleInput, options?: CssxRuntimeOptions): CssxResolvedProps
export declare function clearRawCssCacheForTests (): void
