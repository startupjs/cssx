import type { CompileState, CssxDiagnostic, CssxDiagnosticCode, CssxDiagnosticLevel } from './types.ts'
export declare function diagnostic (code: CssxDiagnosticCode, message: string, level?: CssxDiagnosticLevel, position?: {
  line?: number;
  column?: number;
}): CssxDiagnostic
export declare function addDiagnostic (state: CompileState, item: CssxDiagnostic): void
