import type { ComponentType, ReactNode } from 'react'
import { themed } from '../../src/react/config.ts'
import { cssx, type CssxSheetInput } from '../../src/react/cssx.ts'

interface ButtonProps {
  label: string
}

function Button (props: ButtonProps): ReactNode {
  return props.label
}

const ThemedButton = themed('Button', Button)
export const typedButton: ComponentType<ButtonProps> = ThemedButton

const importedSheet: Record<string, unknown> = {}
const cssxSheet: CssxSheetInput = importedSheet

cssx('root', cssxSheet)
