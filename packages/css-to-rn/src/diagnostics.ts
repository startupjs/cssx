import type { CompileState, CssxDiagnostic, CssxDiagnosticCode, CssxDiagnosticLevel } from './types.ts'

export function diagnostic (
  code: CssxDiagnosticCode,
  message: string,
  level: CssxDiagnosticLevel = 'warning',
  position?: { line?: number, column?: number }
): CssxDiagnostic {
  return {
    level,
    code,
    message,
    line: position?.line,
    column: position?.column
  }
}

export function addDiagnostic (state: CompileState, item: CssxDiagnostic): void {
  state.diagnostics.push(item)
  if (state.mode === 'build' && item.level === 'error') {
    const location = item.line == null ? '' : ` (${item.line}:${item.column ?? 1})`
    throw new Error(`[cssx] ${item.code}${location}: ${item.message}`)
  }
}
