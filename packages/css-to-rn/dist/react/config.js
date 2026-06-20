import { createContext, createElement, useContext, useMemo } from 'react'
import { getRuntimeConfig, setRuntimeConfig } from './store.js'
const CssxConfigContext = createContext(null)
export function configureCssx (config) {
  setRuntimeConfig(config)
}
export function CssxProvider (props) {
  const parent = useContext(CssxConfigContext)
  const value = useMemo(() => ({
    ...(parent ?? getRuntimeConfig()),
    ...(props.value ?? {})
  }), [parent, props.value])
  return createElement(CssxConfigContext.Provider, {
    value
  }, props.children)
}
export function useCssxConfig () {
  return useContext(CssxConfigContext) ?? getRuntimeConfig()
}
