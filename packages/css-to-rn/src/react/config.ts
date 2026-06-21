import {
  createContext,
  createElement,
  forwardRef,
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
  getRuntimeConfig,
  setRuntimeConfig,
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
}

export type CssxRuntimeLayerInput =
  | string
  | CompiledCssSheet
  | TrackedCssxSheet
  | ResolveCssxLayer

export interface CssxProviderProps {
  value?: CssxReactConfig
  style?: CssxProviderStyleInput
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
  hasTransitions: false
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
  const value = useMemo(() => ({
    config: {
      ...parent.config,
      ...(props.value ?? {})
    },
    layers: parent.layers.concat(providerStyles.layers),
    scopedVariables: parent.scopedVariables.concat(providerStyles.scopedVariables),
    componentTag: parent.componentTag
  }), [parent, props.value, providerStyles])

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

export function themed<P extends object> (
  componentTag: string,
  Component: ComponentType<P>
): ComponentType<P> {
  const ThemedComponent = forwardRef<unknown, P>(function ThemedComponent (props, ref): ReactNode {
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
      } as P & { ref: unknown })
    )
  })

  ThemedComponent.displayName = `themed(${Component.displayName ?? Component.name ?? componentTag})`
  return ThemedComponent as unknown as ComponentType<P>
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
    componentTag: null
  }
}

function normalizeProviderStyles (
  style: CssxProviderStyleInput
): { layers: CssxRuntimeLayerInput[], scopedVariables: Record<string, unknown>[] } {
  const layers: CssxRuntimeLayerInput[] = []
  const scopedVariables: Record<string, unknown>[] = []

  collectProviderStyle(style, layers, scopedVariables)

  return {
    layers,
    scopedVariables
  }
}

function collectProviderStyle (
  input: CssxProviderStyleInput,
  layers: CssxRuntimeLayerInput[],
  scopedVariables: Record<string, unknown>[]
): void {
  if (!input) return

  if (Array.isArray(input)) {
    for (const item of input) collectProviderStyle(item, layers, scopedVariables)
    return
  }

  if (typeof input === 'string') {
    const sheet = compileCss(input, { mode: 'runtime' })
    layers.push(sheet)
    collectRootVariables(sheet, scopedVariables)
    return
  }

  if (isTrackedCssxSheet(input)) {
    const sheet = input.getSheet()
    layers.push({ sheet, cacheKey: input })
    collectRootVariables(sheet, scopedVariables, input.getOptions().values)
    return
  }

  if (isCompiledSheet(input)) {
    layers.push(input)
    collectRootVariables(input, scopedVariables)
    return
  }

  if (isProviderStyleLayer(input)) {
    const layer = normalizeProviderStyleLayer(input)
    layers.push(layer)
    const sheet = typeof layer.sheet === 'string'
      ? compileCss(layer.sheet, { mode: 'runtime' })
      : layer.sheet
    collectRootVariables(sheet, scopedVariables, layer.values)
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

function collectRootVariables (
  sheet: CompiledCssSheet,
  scopedVariables: Record<string, unknown>[],
  values: readonly unknown[] = []
): void {
  if (sheet.rootVariables != null) {
    scopedVariables.push(applyLayerValuesToRootVariables(sheet.rootVariables, values))
  }
}

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
