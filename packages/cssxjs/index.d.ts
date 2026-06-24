import type React from 'react'
export {
  CssxProvider,
  TrackedCssxSheet,
  configureCssx,
  cssx,
  defaultVariables,
  getCssColor,
  getCssVariable,
  getCssVariableRaw,
  isTrackedCssxSheet,
  setDefaultVariables,
  themed,
  u,
  useCssColor,
  useCssVariable,
  useCssVariableRaw,
  useCssxLayer,
  useRuntimeCss,
  useCssxComponentTag,
  useCssxConfig,
  useCssxRuntimeContext,
  useCssxSheet,
  useCssxTemplate,
  useMedia,
  variables
} from '@cssxjs/css-to-rn/react'
export type {
  CssColorMixInput,
  CssxProviderStyleInput,
  CssxProviderStyleLayer,
  CssxProviderProps,
  CssxReactConfig,
  CssxResolvedProps,
  CssxRuntimeContextValue,
  CssxRuntimeOptions,
  CssxStyleName,
  CssxVariableStore,
  TrackedCssxSheetOptions
} from '@cssxjs/css-to-rn/react'

export type CssxjsSimpleValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | bigint
  | symbol

export type CssxjsFlagObject = Record<string, CssxjsSimpleValue>
export type StyleNameValue =
  | undefined
  | string
  | CssxjsFlagObject
  | StyleNameValue[]

export function css (css: TemplateStringsArray): any
export function css (
  styleName?: StyleNameValue,
  inlineStyleProps?: Record<string, unknown>
): any
export function styl (styl: TemplateStringsArray): any
export function styl (
  styleName?: StyleNameValue,
  inlineStyleProps?: Record<string, unknown>
): any
export function pug (pug: TemplateStringsArray): React.ReactNode
export function matcher (
  styleName: StyleNameValue,
  fileStyles?: Record<string, unknown>,
  globalStyles?: Record<string, unknown>,
  localStyles?: Record<string, unknown>,
  inlineStyleProps?: Record<string, unknown>
): any
