export type CompileMode = 'runtime' | 'build'

export type CssxDiagnosticLevel = 'warning' | 'error'

export type CssxDiagnosticCode =
  | 'CSS_SYNTAX_ERROR'
  | 'UNSUPPORTED_SELECTOR'
  | 'UNSUPPORTED_AT_RULE'
  | 'INVALID_DECLARATION'
  | 'UNRESOLVED_VARIABLE'
  | 'VARIABLE_CYCLE'
  | 'VARIABLE_DEPTH_LIMIT'
  | 'UNSUPPORTED_INTERPOLATION_POSITION'
  | 'INVALID_INTERPOLATION_VALUE'
  | 'UNSUPPORTED_CALC'
  | 'UNSUPPORTED_BACKGROUND_IMAGE'
  | 'UNSUPPORTED_BACKGROUND_SHORTHAND'

export interface CssxDiagnostic {
  level: CssxDiagnosticLevel
  code: CssxDiagnosticCode
  message: string
  line?: number
  column?: number
}

export interface CompileCssOptions {
  mode?: CompileMode
  id?: string
  sourceId?: string
  contentHash?: string
  sourceIdentity?: string
  target?: CssxTarget
}

export interface CompileCssTemplateOptions extends CompileCssOptions {
  dynamicSlotPrefix?: string
}

export type CssxTarget = 'react-native' | 'web'

export interface CssxMetadata {
  hasVars: boolean
  vars: string[]
  hasMedia: boolean
  hasViewportUnits: boolean
  hasInterpolations: boolean
  hasDynamicRuntimeDependencies: boolean
  hasAnimations: boolean
  hasTransitions: boolean
}

export interface CompiledCssSheet {
  version: 1
  id: string
  sourceId?: string
  contentHash: string
  rules: CssxRule[]
  keyframes: Record<string, CssxKeyframe[]>
  exports?: Record<string, string>
  metadata: CssxMetadata
  diagnostics: CssxDiagnostic[]
  error?: CssxDiagnostic
}

export interface CssxRule {
  selector: string
  classes: string[]
  part: string | null
  specificity: number
  order: number
  media: string | null
  declarations: CssxDeclaration[]
}

export interface CssxDeclaration {
  property: string
  value: string
  raw: string
  order: number
  dynamicSlots?: number[]
  line?: number
  column?: number
}

export interface CssxKeyframe {
  selector: string
  declarations: CssxDeclaration[]
  order: number
}

export interface SelectorParseResult {
  selector: string
  classes: string[]
  part: string | null
  specificity: number
}

export interface CompileState {
  diagnostics: CssxDiagnostic[]
  mode: CompileMode
}
