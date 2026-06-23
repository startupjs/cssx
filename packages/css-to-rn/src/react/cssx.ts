import React, { use } from 'react'
import type { CompiledCssSheet, CssxTarget } from '../types.ts'
import {
  clearCssxRuntimeCachesForTests,
  resolveCssx,
  type CssxCache,
  type CssxLayerInput,
  type InlineStyleInput,
  type ResolvedStyleProps,
  type ResolveCssxLayer,
  type StyleNameValue
} from '../resolve.ts'
import {
  CssxRuntimeContext,
  getDefaultCssxRuntimeContext
} from './config.ts'
import {
  evaluateMediaQuery,
  getMediaQueryEvaluator,
  getDefaultVariableValues,
  getDimensions,
  getDimensionsVersion,
  getVariableValues,
  getVariableVersion,
  type CssxDependencyCollector
} from './store.ts'
import {
  isTrackedCssxSheet,
  type TrackedCssxSheet
} from './tracker.ts'

const ReactInternals = (React as unknown as {
  __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE?: {
    H: unknown
  }
}).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE

export type CssxStyleName = StyleNameValue
export type CssxResolvedProps = ResolvedStyleProps

export interface CssxRuntimeOptions {
  target?: CssxTarget
  values?: readonly unknown[]
  cache?: boolean | CssxCache
  componentTag?: string | null
}

export type CssxSheetInput =
  | string
  | CompiledCssSheet
  | TrackedCssxSheet
  | CssxReactLayer
  | CssxOpaqueSheetRecord
  | readonly CssxSheetInput[]

export type CssxOpaqueSheetRecord = Record<string, unknown>

export interface CssxReactLayer {
  sheet: string | CompiledCssSheet | TrackedCssxSheet
  values?: readonly unknown[]
  cacheKey?: unknown
}

interface NormalizedReactLayers {
  layers: CssxLayerInput | CssxLayerInput[]
  collectors: CssxDependencyCollector[]
  cache?: boolean | CssxCache
  target?: CssxTarget
}

export function cssx (
  styleName: CssxStyleName,
  sheetInput: CssxSheetInput,
  inlineStyleProps?: InlineStyleInput,
  options: CssxRuntimeOptions = {}
): CssxResolvedProps {
  const runtimeContext = readRuntimeContext()
  const normalized = normalizeSheetInput([
    runtimeContext.layers,
    sheetInput
  ], options)
  const result = resolveCssx({
    styleName,
    layers: normalized.layers,
    inlineStyleProps,
    target: options.target ?? normalized.target ?? 'react-native',
    componentTag: options.componentTag ?? runtimeContext.componentTag,
    variables: getVariableValues(),
    scopedVariables: runtimeContext.scopedVariables,
    defaultVariables: getDefaultVariableValues(),
    dimensions: getDimensions(),
    mediaQueryEvaluator: getMediaQueryEvaluator(),
    theme: runtimeContext.theme,
    cache: options.cache ?? normalized.cache
  })

  for (const collector of normalized.collectors) {
    recordDependencies(collector, result)
  }

  return result.props
}

function readRuntimeContext () {
  if (ReactInternals?.H == null) {
    return getDefaultCssxRuntimeContext()
  }

  try {
    return use(CssxRuntimeContext) ?? getDefaultCssxRuntimeContext()
  } catch {
    return getDefaultCssxRuntimeContext()
  }
}

export function clearRawCssCacheForTests (): void {
  clearCssxRuntimeCachesForTests()
}

function normalizeSheetInput (
  input: CssxSheetInput,
  options: CssxRuntimeOptions
): NormalizedReactLayers {
  const rawLayers = Array.isArray(input) ? input : [input]
  const layers: CssxLayerInput[] = []
  const collectors: CssxDependencyCollector[] = []
  let cache: boolean | CssxCache | undefined
  let target: CssxTarget | undefined

  for (const rawLayer of rawLayers) {
    const normalized = normalizeLayer(rawLayer, options)
    if (Array.isArray(normalized.layers)) layers.push(...normalized.layers)
    else layers.push(normalized.layers)
    collectors.push(...normalized.collectors)
    cache ??= normalized.cache
    target ??= normalized.target
  }

  return {
    layers,
    collectors,
    cache,
    target
  }
}

function normalizeLayer (
  input: CssxSheetInput,
  options: CssxRuntimeOptions
): NormalizedReactLayers {
  if (Array.isArray(input)) return normalizeSheetInput(input, options)

  if (isTrackedCssxSheet(input)) {
    const trackerOptions = input.getOptions()
    const layer: ResolveCssxLayer = {
      sheet: input.getSheet(),
      values: options.values ?? trackerOptions.values ?? [],
      cacheKey: input
    }

    return {
      layers: layer,
      collectors: [input],
      cache: options.cache ?? input.getCache(),
      target: options.target ?? trackerOptions.target
    }
  }

  if (isReactLayer(input)) {
    const nested = normalizeLayer(input.sheet, options)
    const baseLayers = Array.isArray(nested.layers)
      ? nested.layers
      : [nested.layers]
    const layers = baseLayers.map(layer => {
      if (typeof layer === 'string') {
        return {
          sheet: layer,
          values: input.values ?? options.values ?? [],
          cacheKey: input.cacheKey
        }
      }
      if ('sheet' in layer) {
        return {
          ...layer,
          values: input.values ?? layer.values ?? options.values ?? [],
          cacheKey: input.cacheKey ?? layer.cacheKey
        }
      }
      return {
        sheet: layer,
        values: input.values ?? options.values ?? [],
        cacheKey: input.cacheKey
      }
    })

    return {
      ...nested,
      layers
    }
  }

  if (typeof input === 'string') {
    return {
      layers: input,
      collectors: [],
      cache: options.cache
    }
  }

  if (isCompiledSheet(input)) {
    return {
      layers: {
        sheet: input,
        values: options.values ?? []
      },
      collectors: [],
      cache: options.cache
    }
  }

  return {
    layers: [],
    collectors: [],
    cache: options.cache
  }
}

function isReactLayer (value: unknown): value is CssxReactLayer {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'sheet' in value &&
    !isTrackedCssxSheet(value) &&
    !isCompiledSheet(value)
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

function recordDependencies (
  collector: CssxDependencyCollector,
  result: { dependencies: { vars: string[], dimensions: boolean, media: string[], mediaMatches?: Record<string, boolean> } }
): void {
  for (const name of result.dependencies.vars) {
    collector.recordVariable(name, getVariableVersion(name))
  }

  if (result.dependencies.dimensions) {
    collector.recordDimensions(getDimensionsVersion())
  }

  for (const query of result.dependencies.media) {
    collector.recordMedia(query, result.dependencies.mediaMatches?.[query] ?? evaluateMediaQuery(query))
  }
}
