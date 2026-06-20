export type CssPlatform = 'react-native' | 'web'
export type TransformStyleValue = string | number | boolean | null | undefined | TransformStyle | TransformStyleValue[]
export interface TransformStyle {
  [property: string]: TransformStyleValue;
}
export interface CssDeclaration {
  property: string;
  raw?: string;
  value?: string;
  order?: number;
}
export interface TransformDeclarationOptions {
  platform?: CssPlatform;
  keyframes?: Record<string, TransformStyle>;
  onInvalid?: 'diagnose' | 'throw';
  shorthandBlacklist?: readonly string[];
}
export type TransformDiagnosticCode = 'INVALID_DECLARATION' | 'UNSUPPORTED_BACKGROUND_IMAGE' | 'UNSUPPORTED_BACKGROUND_SHORTHAND'
export interface TransformDiagnostic {
  code: TransformDiagnosticCode;
  property: string;
  value: string;
  message: string;
  order?: number;
}
export interface TransformDeclarationResult {
  style: TransformStyle;
  diagnostics: TransformDiagnostic[];
}
export declare function transformDeclarations (declarations: readonly CssDeclaration[], options?: TransformDeclarationOptions): TransformDeclarationResult
export declare function getPropertyName (property: string): string
export declare function transformRawValue (value: string): TransformStyleValue
