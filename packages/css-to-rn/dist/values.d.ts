import type { CssxDiagnostic } from './types.ts'
export type InterpolationValue = string | number | null | undefined | false
export interface ResolveCssValueOptions {
  values?: readonly unknown[];
  variables?: Record<string, unknown>;
  defaultVariables?: Record<string, unknown>;
  dimensions?: {
    width?: number;
    height?: number;
  };
  maxVarDepth?: number;
}
export interface ResolveCssValueResult {
  value?: string;
  valid: boolean;
  dependencies: {
    vars: string[];
    dimensions: boolean;
  };
  diagnostics: CssxDiagnostic[];
}
export declare function resolveCssValue (input: string, options?: ResolveCssValueOptions): ResolveCssValueResult
