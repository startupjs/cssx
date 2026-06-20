import type { CompiledCssSheet } from '../types.ts'
import { type CssxReactConfig } from './config.ts'
import { TrackedCssxSheet } from './tracker.ts'
export type CssxLayerHookInput = string | CompiledCssSheet | TrackedCssxSheet | {
  sheet: string | CompiledCssSheet | TrackedCssxSheet;
  values?: readonly unknown[];
} | null | undefined | false
export type CssxLayerHookOutput = string | TrackedCssxSheet | {
  sheet: string | TrackedCssxSheet;
  values?: readonly unknown[];
} | null | undefined | false
export declare function useCssxSheet (sheet: CompiledCssSheet, options?: CssxReactConfig): TrackedCssxSheet
export declare function useCompiledCss (input: string | CompiledCssSheet, options?: CssxReactConfig): TrackedCssxSheet
export declare function useCssxTemplate (sheet: CompiledCssSheet, values: readonly unknown[], options?: CssxReactConfig): TrackedCssxSheet
export declare function useCssxLayer (input: CssxLayerHookInput, options?: CssxReactConfig): CssxLayerHookOutput
