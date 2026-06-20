import type { CssxDiagnostic, SelectorParseResult } from './types.ts'
export declare function parseSelector (selector: string, position?: {
  line?: number;
  column?: number;
}): {
  result?: SelectorParseResult;
  diagnostic?: CssxDiagnostic;
}
