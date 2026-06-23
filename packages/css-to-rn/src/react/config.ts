import {
  createContext,
  createElement,
  forwardRef,
  type ComponentProps,
  type ComponentType,
  useEffect,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode
} from 'react'
import { compileCss } from '../compiler.ts'
import type { CompiledCssSheet } from '../types.ts'
import {
  getColorScheme,
  getColorSchemeVersion,
  getRuntimeConfig,
  setRuntimeConfig,
  subscribeColorScheme,
  type CssxRuntimeConfig
} from './store.ts'
import {
  isTrackedCssxSheet,
  TrackedCssxSheet,
  type TrackedCssxSheetOptions
} from './tracker.ts'
import type {
  ResolveCssxLayer
} from '../resolve.ts'
import type { CssxMetadata } from '../types.ts'

export interface CssxReactConfig extends CssxRuntimeConfig, TrackedCssxSheetOptions {}

export type CssxProviderStyleInput =
  | string
  | CompiledCssSheet
  | TrackedCssxSheet
  | CssxProviderStyleLayer
  | null
  | undefined
  | false
  | readonly CssxProviderStyleInput[]

export interface CssxProviderStyleLayer {
  sheet: string | CompiledCssSheet | TrackedCssxSheet
  values?: readonly unknown[]
  cacheKey?: unknown
}

export interface CssxRuntimeContextValue {
  config: CssxReactConfig
  layers: CssxRuntimeLayerInput[]
  scopedVariables: Record<string, unknown>[]
  componentTag: string | null
  theme: string
  themePreference: string
  themeNames: string[]
}

export type CssxRuntimeLayerInput =
  | string
  | CompiledCssSheet
  | TrackedCssxSheet
  | ResolveCssxLayer

export interface CssxProviderProps {
  value?: CssxReactConfig
  style?: CssxProviderStyleInput
  theme?: string
  children?: ReactNode
}

export const CssxRuntimeContext = createContext<CssxRuntimeContextValue | null>(null)
const useCommitEffect = typeof window === 'undefined'
  ? useEffect
  : useLayoutEffect
const EMPTY_METADATA: CssxMetadata = {
  hasVars: false,
  vars: [],
  hasMedia: false,
  hasViewportUnits: false,
  hasInterpolations: false,
  hasDynamicRuntimeDependencies: false,
  hasAnimations: false,
  hasTransitions: false,
  hasThemes: false
}
const EMPTY_TRACKING_SHEET: CompiledCssSheet = {
  version: 1,
  id: 'cssx_theme_tracker',
  contentHash: 'cssx_theme_tracker',
  rules: [],
  keyframes: {},
  metadata: EMPTY_METADATA,
  diagnostics: []
}
const DYNAMIC_ROOT_SLOT_RE = /var\(\s*--__cssx_dynamic_(\d+)\s*\)/g

export function configureCssx (config: CssxReactConfig): void {
  setRuntimeConfig(config)
}

export function CssxProvider (props: CssxProviderProps): ReactNode {
  const parent = useContext(CssxRuntimeContext) ?? getDefaultCssxRuntimeContext()
  const providerStyles = useMemo(
    () => normalizeProviderStyles(props.style),
    [props.style]
  )
  const layers = useMemo(
    () => parent.layers.concat(providerStyles.layers),
    [parent.layers, providerStyles.layers]
  )
  const themeNames = useMemo(
    () => mergeThemeNames(parent.themeNames, providerStyles.themeNames),
    [parent.themeNames, providerStyles.themeNames]
  )
  const themePreference = props.theme ?? parent.themePreference
  const colorSchemeVersion = useAutoThemeColorSchemeVersion(themePreference)
  const theme = useMemo(
    () => resolveProviderTheme(themePreference, themeNames),
    [themePreference, themeNames, colorSchemeVersion]
  )
  const scopedVariables = useMemo(() => {
    const scopes = [...parent.scopedVariables]
    collectProviderRootVariables(providerStyles.layers, scopes, theme)
    return scopes
  }, [parent.scopedVariables, providerStyles.layers, theme])
  const value = useMemo(() => ({
    config: {
      ...parent.config,
      ...(props.value ?? {})
    },
    layers,
    scopedVariables,
    componentTag: parent.componentTag,
    theme,
    themePreference,
    themeNames
  }), [parent.config, parent.componentTag, props.value, layers, scopedVariables, theme, themePreference, themeNames])

  return createElement(CssxRuntimeContext.Provider, {
    value
  }, props.children)
}

export function useCssxConfig (): CssxReactConfig {
  return useCssxRuntimeContext().config
}

export function useCssxRuntimeContext (): CssxRuntimeContextValue {
  return useContext(CssxRuntimeContext) ?? getDefaultCssxRuntimeContext()
}

export function useCssxComponentTag (): string | null {
  return useCssxRuntimeContext().componentTag
}

export function themed<C extends ComponentType<any>> (
  componentTag: string,
  Component: C
): C {
  const ThemedComponent = forwardRef<unknown, ComponentProps<C>>(function ThemedComponent (props, ref): ReactNode {
    const parent = useCssxRuntimeContext()
    const tracker = useCssxRenderTracker(parent.config)
    const value = useMemo(() => ({
      ...parent,
      layers: parent.layers.concat(tracker),
      componentTag
    }), [parent, tracker])

    return createElement(
      CssxRuntimeContext.Provider,
      { value },
      createElement(Component, {
        ...props,
        ref
      } as ComponentProps<C> & { ref: unknown })
    )
  })

  ThemedComponent.displayName = `themed(${Component.displayName ?? Component.name ?? componentTag})`
  return ThemedComponent as unknown as C
}

function useCssxRenderTracker (options: CssxReactConfig): TrackedCssxSheet {
  const trackerRef = useRef<TrackedCssxSheet | null>(null)
  const committedTracker = trackerRef.current
  const tracker = committedTracker?.matches(EMPTY_TRACKING_SHEET, options)
    ? committedTracker
    : new TrackedCssxSheet(EMPTY_TRACKING_SHEET, options)
  const renderDependencies = tracker.startRender()

  useSyncExternalStore(
    tracker.subscribe,
    tracker.getSnapshot,
    tracker.getServerSnapshot
  )

  useCommitEffect(() => {
    tracker.commitRender(renderDependencies)
    trackerRef.current = tracker
  })

  return tracker
}

export function getDefaultCssxRuntimeContext (): CssxRuntimeContextValue {
  return {
    config: getRuntimeConfig(),
    layers: [],
    scopedVariables: [],
    componentTag: null,
    theme: 'default',
    themePreference: 'auto',
    themeNames: []
  }
}

function normalizeProviderStyles (
  style: CssxProviderStyleInput
): { layers: CssxRuntimeLayerInput[], themeNames: string[] } {
  const layers: CssxRuntimeLayerInput[] = []
  const themeNames = new Set<string>()

  collectProviderStyle(style, layers, themeNames)

  return {
    layers,
    themeNames: Array.from(themeNames).sort()
  }
}

function collectProviderStyle (
  input: CssxProviderStyleInput,
  layers: CssxRuntimeLayerInput[],
  themeNames: Set<string>
): void {
  if (!input) return

  if (Array.isArray(input)) {
    for (const item of input) collectProviderStyle(item, layers, themeNames)
    return
  }

  if (typeof input === 'string') {
    const sheet = compileCss(input, { mode: 'runtime' })
    layers.push(sheet)
    collectThemeNames(sheet, themeNames)
    return
  }

  if (isTrackedCssxSheet(input)) {
    const sheet = input.getSheet()
    layers.push({ sheet, cacheKey: input })
    collectThemeNames(sheet, themeNames)
    return
  }

  if (isCompiledSheet(input)) {
    layers.push(input)
    collectThemeNames(input, themeNames)
    return
  }

  if (isProviderStyleLayer(input)) {
    const layer = normalizeProviderStyleLayer(input)
    layers.push(layer)
    const sheet = typeof layer.sheet === 'string'
      ? compileCss(layer.sheet, { mode: 'runtime' })
      : layer.sheet
    collectThemeNames(sheet, themeNames)
  }
}

function normalizeProviderStyleLayer (
  input: CssxProviderStyleLayer
): ResolveCssxLayer {
  if (typeof input.sheet === 'string') {
    return {
      sheet: compileCss(input.sheet, { mode: 'runtime' }),
      values: input.values,
      cacheKey: input.cacheKey
    }
  }

  if (isTrackedCssxSheet(input.sheet)) {
    return {
      sheet: input.sheet.getSheet(),
      values: input.values,
      cacheKey: input.cacheKey ?? input.sheet
    }
  }

  return {
    sheet: input.sheet,
    values: input.values,
    cacheKey: input.cacheKey
  }
}

function collectProviderRootVariables (
  layers: readonly CssxRuntimeLayerInput[],
  scopedVariables: Record<string, unknown>[],
  theme: string
): void {
  for (const input of layers) {
    const layer = normalizeRuntimeLayer(input)
    if (layer == null) continue

    if (layer.sheet.rootVariables != null) {
      scopedVariables.push(applyLayerValuesToRootVariables(layer.sheet.rootVariables, layer.values))
    }

    const themeRootVariables = getThemeVariables(layer.sheet, theme)
    if (themeRootVariables != null) {
      scopedVariables.push(applyLayerValuesToRootVariables(themeRootVariables, layer.values))
    }
  }
}

function normalizeRuntimeLayer (
  input: CssxRuntimeLayerInput
): { sheet: CompiledCssSheet, values: readonly unknown[] } | null {
  if (typeof input === 'string') {
    return { sheet: compileCss(input, { mode: 'runtime' }), values: [] }
  }

  if (isTrackedCssxSheet(input)) {
    return {
      sheet: input.getSheet(),
      values: input.getOptions().values ?? []
    }
  }

  if (isCompiledSheet(input)) {
    return { sheet: input, values: [] }
  }

  const sheet = typeof input.sheet === 'string'
    ? compileCss(input.sheet, { mode: 'runtime' })
    : input.sheet

  return {
    sheet,
    values: input.values ?? []
  }
}

function collectThemeNames (
  sheet: CompiledCssSheet,
  themeNames: Set<string>
): void {
  if (sheet.themeVariables == null) return
  for (const name of Object.keys(sheet.themeVariables)) themeNames.add(name)
}

function getThemeVariables (
  sheet: CompiledCssSheet,
  theme: string
): Record<string, string> | undefined {
  if (sheet.themeVariables == null) return undefined
  if (theme === 'light') return sheet.themeVariables.light ?? sheet.themeVariables.default
  if (theme === 'default') return sheet.themeVariables.default
  return sheet.themeVariables[theme]
}

function mergeThemeNames (
  parentNames: readonly string[],
  providerNames: readonly string[]
): string[] {
  if (parentNames.length === 0) return [...providerNames]
  if (providerNames.length === 0) return [...parentNames]
  return Array.from(new Set([...parentNames, ...providerNames])).sort()
}

function useAutoThemeColorSchemeVersion (themePreference: string): number {
  const shouldSubscribe = themePreference === 'auto'
  return useSyncExternalStore(
    shouldSubscribe ? subscribeColorScheme : noopSubscribe,
    shouldSubscribe ? getColorSchemeVersion : zeroSnapshot,
    zeroSnapshot
  )
}

function resolveProviderTheme (
  themePreference: string,
  themeNames: readonly string[]
): string {
  const themeSet = new Set(themeNames)

  if (themePreference === 'auto') {
    return getColorScheme() === 'dark' && themeSet.has('dark')
      ? 'dark'
      : 'default'
  }

  if (themePreference === 'light') {
    return themeSet.has('light') ? 'light' : 'default'
  }

  return themePreference || 'default'
}

function noopSubscribe (): () => void {
  return noop
}

function zeroSnapshot (): number {
  return 0
}

function noop (): void {}

function applyLayerValuesToRootVariables (
  rootVariables: Record<string, string>,
  values: readonly unknown[]
): Record<string, string> {
  if (values.length === 0) return rootVariables

  const output: Record<string, string> = {}
  for (const name of Object.keys(rootVariables)) {
    const value = rootVariables[name]
    let valid = true
    const next = value.replace(DYNAMIC_ROOT_SLOT_RE, (_match, rawIndex: string) => {
      const interpolation = values[Number(rawIndex)]
      if (typeof interpolation === 'string') return interpolation
      if (typeof interpolation === 'number') return String(interpolation)
      valid = false
      return ''
    })
    if (valid) output[name] = next
  }
  return output
}

function isProviderStyleLayer (value: unknown): value is CssxProviderStyleLayer {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'sheet' in value &&
    !isCompiledSheet(value) &&
    !isTrackedCssxSheet(value)
  )
}

function isCompiledSheet (value: unknown): value is CompiledCssSheet {
  return Boolean(
    value &&
    typeof value === 'object' &&
    (value as { version?: unknown }).version === 1 &&
    Array.isArray((value as { rules?: unknown }).rules)
  )
}
