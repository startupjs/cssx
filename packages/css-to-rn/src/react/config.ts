import {
  createContext,
  createElement,
  useContext,
  useMemo,
  type ReactNode
} from 'react'
import {
  getRuntimeConfig,
  setRuntimeConfig,
  type CssxRuntimeConfig
} from './store.ts'
import type { TrackedCssxSheetOptions } from './tracker.ts'

export interface CssxReactConfig extends CssxRuntimeConfig, TrackedCssxSheetOptions {}

export interface CssxProviderProps {
  value?: CssxReactConfig
  children?: ReactNode
}

const CssxConfigContext = createContext<CssxReactConfig | null>(null)

export function configureCssx (config: CssxReactConfig): void {
  setRuntimeConfig(config)
}

export function CssxProvider (props: CssxProviderProps): ReactNode {
  const parent = useContext(CssxConfigContext)
  const value = useMemo(
    () => ({
      ...(parent ?? getRuntimeConfig()),
      ...(props.value ?? {})
    }),
    [parent, props.value]
  )

  return createElement(CssxConfigContext.Provider, {
    value
  }, props.children)
}

export function useCssxConfig (): CssxReactConfig {
  return useContext(CssxConfigContext) ?? getRuntimeConfig()
}
