import { clearCssxRuntimeCachesForTests, resolveCssx } from '../resolve.js'
import { evaluateMediaQuery, getDefaultVariableValues, getDimensions, getDimensionsVersion, getVariableValues, getVariableVersion } from './store.js'
import { isTrackedCssxSheet } from './tracker.js'
export function cssx (styleName, sheetInput, inlineStyleProps, options = {}) {
  const normalized = normalizeSheetInput(sheetInput, options)
  const result = resolveCssx({
    styleName,
    layers: normalized.layers,
    inlineStyleProps,
    target: options.target ?? normalized.target ?? 'react-native',
    variables: getVariableValues(),
    defaultVariables: getDefaultVariableValues(),
    dimensions: getDimensions(),
    cache: options.cache ?? normalized.cache
  })
  for (const collector of normalized.collectors) {
    recordDependencies(collector, result)
  }
  return result.props
}
export function clearRawCssCacheForTests () {
  clearCssxRuntimeCachesForTests()
}
function normalizeSheetInput (input, options) {
  const rawLayers = Array.isArray(input) ? input : [input]
  const layers = []
  const collectors = []
  let cache
  let target
  for (const rawLayer of rawLayers) {
    const normalized = normalizeLayer(rawLayer, options)
    if (Array.isArray(normalized.layers)) { layers.push(...normalized.layers) } else { layers.push(normalized.layers) }
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
function normalizeLayer (input, options) {
  if (Array.isArray(input)) { return normalizeSheetInput(input, options) }
  if (isTrackedCssxSheet(input)) {
    const trackerOptions = input.getOptions()
    const layer = {
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
function isReactLayer (value) {
  return Boolean(value &&
        typeof value === 'object' &&
        'sheet' in value &&
        !isTrackedCssxSheet(value) &&
        !isCompiledSheet(value))
}
function isCompiledSheet (value) {
  return Boolean(value &&
        typeof value === 'object' &&
        value.version === 1 &&
        Array.isArray(value.rules))
}
function recordDependencies (collector, result) {
  for (const name of result.dependencies.vars) {
    collector.recordVariable(name, getVariableVersion(name))
  }
  if (result.dependencies.dimensions) {
    collector.recordDimensions(getDimensionsVersion())
  }
  for (const query of result.dependencies.media) {
    collector.recordMedia(query, evaluateMediaQuery(query))
  }
}
