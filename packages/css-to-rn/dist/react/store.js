import mediaQuery from 'css-mediaquery'
const FALLBACK_DIMENSIONS = { width: 1024, height: 768 }
const variableValues = Object.create(null)
const defaultVariableValues = Object.create(null)
const variableVersions = new Map()
const runtimeSubscribers = new Set()
const pendingVariableNames = new Set()
let runtimeConfig = {
  dimensionsDebounceMs: 0
}
let variableVersion = 0
let dimensionsAdapter = null
let dimensionsAdapterUnsubscribe = null
let dimensions = readWindowDimensions()
let dimensionsVersion = 0
let pendingDimensionsChanged = false
let notifyScheduled = false
let resizeListener = null
let resizeTimer = null
export const variables = createVariableProxy(variableValues)
export const defaultVariables = createVariableProxy(defaultVariableValues)
export function setDefaultVariables (next) {
  const changed = new Set()
  for (const name of Object.keys(defaultVariableValues)) {
    if (!Object.prototype.hasOwnProperty.call(next, name)) {
      delete defaultVariableValues[name]
      changed.add(name)
    }
  }
  for (const [name, value] of Object.entries(next)) {
    if (Object.is(defaultVariableValues[name], value)) { continue }
    defaultVariableValues[name] = value
    changed.add(name)
  }
  markVariablesChanged(Array.from(changed))
}
export function getVariableValues () {
  return variableValues
}
export function getDefaultVariableValues () {
  return defaultVariableValues
}
export function getVariableVersion (name) {
  return variableVersions.get(name) ?? 0
}
export function getRuntimeVersion () {
  return variableVersion + dimensionsVersion
}
export function createDependencySnapshot () {
  return {
    vars: new Map(),
    media: new Map(),
    dimensionsVersion: null
  }
}
export function getDimensions () {
  return dimensions
}
export function getDimensionsVersion () {
  return dimensionsVersion
}
export function setDimensionsForTests (next) {
  applyDimensions(next)
}
export function configureDimensionsAdapter (adapter) {
  if (dimensionsAdapter === adapter) { return }
  removeWindowResizeListener()
  dimensionsAdapter = adapter
  applyDimensions(readWindowDimensions())
  if (runtimeSubscribers.size > 0) { ensureWindowResizeListener() }
}
export function evaluateMediaQuery (query) {
  const normalized = stripMediaPrefix(query)
  try {
    return mediaQuery.match(normalized, mediaValues(dimensions))
  } catch {
    return false
  }
}
export function setRuntimeConfig (next) {
  runtimeConfig = {
    ...runtimeConfig,
    ...next
  }
}
export function getRuntimeConfig () {
  return runtimeConfig
}
export function subscribeRuntimeStore (listener, getDependencies) {
  const subscriber = { listener, getDependencies }
  runtimeSubscribers.add(subscriber)
  ensureWindowResizeListener()
  return () => {
    runtimeSubscribers.delete(subscriber)
    if (runtimeSubscribers.size === 0) { removeWindowResizeListener() }
  }
}
export function hasStaleDependencies (dependencies) {
  for (const [name, version] of dependencies.vars) {
    if (getVariableVersion(name) !== version) { return true }
  }
  if (dependencies.dimensionsVersion != null &&
        dependencies.dimensionsVersion !== dimensionsVersion) {
    return true
  }
  for (const [query, matches] of dependencies.media) {
    if (evaluateMediaQuery(query) !== matches) { return true }
  }
  return false
}
export function subscribeVariablesForTests (names, listener) {
  const dependencies = createDependencySnapshot()
  for (const name of names) {
    dependencies.vars.set(name, getVariableVersion(name))
  }
  return subscribeRuntimeStore(change => listener(change.vars), () => dependencies)
}
export function getRuntimeSubscriberCountForTests () {
  return runtimeSubscribers.size
}
export async function flushMicrotasksForTests () {
  await Promise.resolve()
  await Promise.resolve()
}
export function resetStoreForTests () {
  clearRecord(variableValues)
  clearRecord(defaultVariableValues)
  variableVersions.clear()
  pendingVariableNames.clear()
  variableVersion = 0
  removeWindowResizeListener()
  dimensionsAdapter = null
  dimensions = FALLBACK_DIMENSIONS
  dimensionsVersion = 0
  pendingDimensionsChanged = false
  notifyScheduled = false
  runtimeSubscribers.clear()
}
function createVariableProxy (target) {
  return new Proxy(target, {
    set (record, property, value) {
      if (typeof property !== 'string') {
        return Reflect.set(record, property, value)
      }
      if (Object.is(record[property], value)) { return true }
      record[property] = value
      markVariablesChanged([property])
      return true
    },
    deleteProperty (record, property) {
      if (typeof property !== 'string') {
        return Reflect.deleteProperty(record, property)
      }
      if (!Object.prototype.hasOwnProperty.call(record, property)) { return true }
      delete record[property]
      markVariablesChanged([property])
      return true
    }
  })
}
function markVariablesChanged (names) {
  if (names.length === 0) { return }
  for (const name of names) {
    variableVersion += 1
    variableVersions.set(name, variableVersion)
    pendingVariableNames.add(name)
  }
  scheduleNotification()
}
function applyDimensions (next) {
  if (Object.is(dimensions.width, next.width) &&
        Object.is(dimensions.height, next.height)) {
    return
  }
  dimensions = next
  dimensionsVersion += 1
  pendingDimensionsChanged = true
  scheduleNotification()
}
function scheduleNotification () {
  if (notifyScheduled) { return }
  notifyScheduled = true
  queueMicrotask(() => {
    notifyScheduled = false
    flushNotifications()
  })
}
function flushNotifications () {
  const vars = Array.from(pendingVariableNames)
  const dimensionsChanged = pendingDimensionsChanged
  pendingVariableNames.clear()
  pendingDimensionsChanged = false
  if (vars.length === 0 && !dimensionsChanged) { return }
  const change = { vars, dimensions: dimensionsChanged }
  for (const subscriber of Array.from(runtimeSubscribers)) {
    if (shouldNotifySubscriber(subscriber.getDependencies(), change)) {
      subscriber.listener(change)
    }
  }
}
function shouldNotifySubscriber (dependencies, change) {
  for (const name of change.vars) {
    if (dependencies.vars.has(name)) { return true }
  }
  if (!change.dimensions) { return false }
  if (dependencies.dimensionsVersion != null) { return true }
  for (const [query, matches] of dependencies.media) {
    if (evaluateMediaQuery(query) !== matches) { return true }
  }
  return false
}
function ensureWindowResizeListener () {
  if (dimensionsAdapter != null) {
    if (dimensionsAdapterUnsubscribe != null) { return }
    dimensionsAdapterUnsubscribe = dimensionsAdapter.subscribe(() => {
      applyDimensions(readWindowDimensions())
    })
    applyDimensions(readWindowDimensions())
    return
  }
  if (resizeListener != null || typeof window === 'undefined') { return }
  resizeListener = () => {
    const hasPendingTrailingUpdate = resizeTimer != null
    if (resizeTimer != null) { clearTimeout(resizeTimer) }
    const delay = runtimeConfig.dimensionsDebounceMs
    if (delay <= 0) {
      applyDimensions(readWindowDimensions())
      return
    }
    if (!hasPendingTrailingUpdate) {
      applyDimensions(readWindowDimensions())
    }
    resizeTimer = setTimeout(() => {
      resizeTimer = null
      applyDimensions(readWindowDimensions())
    }, delay)
  }
  window.addEventListener('resize', resizeListener)
  applyDimensions(readWindowDimensions())
}
function removeWindowResizeListener () {
  if (resizeTimer != null) {
    clearTimeout(resizeTimer)
    resizeTimer = null
  }
  if (dimensionsAdapterUnsubscribe != null) {
    dimensionsAdapterUnsubscribe()
    dimensionsAdapterUnsubscribe = null
  }
  if (resizeListener == null || typeof window === 'undefined') {
    resizeListener = null
    return
  }
  window.removeEventListener('resize', resizeListener)
  resizeListener = null
}
function readWindowDimensions () {
  if (dimensionsAdapter != null) { return dimensionsAdapter.get() }
  if (typeof window === 'undefined') { return FALLBACK_DIMENSIONS }
  return {
    width: window.innerWidth || FALLBACK_DIMENSIONS.width,
    height: window.innerHeight || FALLBACK_DIMENSIONS.height
  }
}
function stripMediaPrefix (query) {
  return query.trim().replace(/^@media\s+/i, '').trim()
}
function mediaValues (next) {
  return {
    type: 'screen',
    width: `${next.width}px`,
    height: `${next.height}px`,
    'device-width': `${next.width}px`,
    'device-height': `${next.height}px`,
    orientation: next.width >= next.height ? 'landscape' : 'portrait'
  }
}
function clearRecord (record) {
  for (const key of Object.keys(record)) {
    delete record[key]
  }
}
