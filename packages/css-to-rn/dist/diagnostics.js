export function diagnostic (code, message, level = 'warning', position) {
  return {
    level,
    code,
    message,
    line: position?.line,
    column: position?.column
  }
}
export function addDiagnostic (state, item) {
  state.diagnostics.push(item)
  if (state.mode === 'build' && item.level === 'error') {
    const location = item.line == null ? '' : ` (${item.line}:${item.column ?? 1})`
    throw new Error(`[cssx] ${item.code}${location}: ${item.message}`)
  }
}
