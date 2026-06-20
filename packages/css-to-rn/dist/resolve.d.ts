import type { TransformStyle, TransformStyleValue } from './transform/index.ts'
import type { CompiledCssSheet, CssxDiagnostic, CssxTarget } from './types.ts'
export type StyleNameValue = string | number | null | undefined | false | Record<string, unknown> | readonly StyleNameValue[]
export type CssxLayerInput = string | CompiledCssSheet | ResolveCssxLayer
export interface ResolveCssxLayer {
  sheet: CompiledCssSheet | string;
  values?: readonly unknown[];
  cacheKey?: unknown;
}
export interface ResolveCssxOptions {
  styleName: StyleNameValue;
  layers?: CssxLayerInput | readonly CssxLayerInput[];
  inlineStyleProps?: InlineStyleInput;
  variables?: Record<string, unknown>;
  defaultVariables?: Record<string, unknown>;
  dimensions?: CssxDimensions;
  target?: CssxTarget;
  cache?: boolean | CssxCache;
  cacheMaxEntries?: number;
}
export interface CssxDimensions {
  width?: number;
  height?: number;
  type?: string;
}
export type InlineStyleInput = TransformStyle | ResolvedStyleProps | null | undefined | false
export interface ResolvedStyleProps {
  [propName: string]: TransformStyleValue;
}
export interface ResolveCssxResult {
  props: ResolvedStyleProps;
  diagnostics: CssxDiagnostic[];
  dependencies: ResolveCssxDependencies;
  cacheHit: boolean;
}
export interface ResolveCssxDependencies {
  vars: string[];
  dimensions: boolean;
  media: string[];
  sheets: string[];
}
export interface CssxCache {
  maxEntries: number;
  entries: Map<string, ResolveCacheEntry>;
}
interface ResolveCacheEntry {
  dynamicSignature: string;
  values: readonly unknown[];
  result: ResolveCssxResult;
}
export declare function createCssxCache (options?: {
  maxEntries?: number;
}): CssxCache
export declare function clearCssxRuntimeCachesForTests (): void
export declare function cssx (styleName: StyleNameValue, layers?: CssxLayerInput | readonly CssxLayerInput[], inlineStyleProps?: InlineStyleInput, options?: Omit<ResolveCssxOptions, 'styleName' | 'layers' | 'inlineStyleProps'>): ResolvedStyleProps
export declare function resolveCssx (options: ResolveCssxOptions): ResolveCssxResult
export {}
