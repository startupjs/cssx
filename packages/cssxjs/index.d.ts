import type React from 'react'

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
