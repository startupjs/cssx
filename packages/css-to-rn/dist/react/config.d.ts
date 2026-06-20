import { type ReactNode } from 'react'
import { type CssxRuntimeConfig } from './store.ts'
import type { TrackedCssxSheetOptions } from './tracker.ts'
export interface CssxReactConfig extends CssxRuntimeConfig, TrackedCssxSheetOptions {
}
export interface CssxProviderProps {
  value?: CssxReactConfig;
  children?: ReactNode;
}
export declare function configureCssx (config: CssxReactConfig): void
export declare function CssxProvider (props: CssxProviderProps): ReactNode
export declare function useCssxConfig (): CssxReactConfig
