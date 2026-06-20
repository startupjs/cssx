import mediaQuery from 'css-mediaquery'

export interface CssxRuntimeConfig {
  dimensionsDebounceMs?: number
}

export interface CssxDependencySnapshot {
  vars: Map<string, number>
  media: Map<string, boolean>
  dimensionsVersion: number | null
}

export interface CssxDependencyCollector {
  recordVariable: (name: string, version: number) => void
  recordMedia: (query: string, matches: boolean) => void
  recordDimensions: (version: number) => void
}

export interface RuntimeChangeSnapshot {
  vars: readonly string[]
  dimensions: boolean
}

type RuntimeSubscriber = {
  listener: (change: RuntimeChangeSnapshot) => void
  getDependencies: () => CssxDependencySnapshot
}

const FALLBACK_DIMENSIONS = { width: 1024, height: 768 }

const variableValues: Record<string, unknown> = Object.create(null)
const defaultVariableValues: Record<string, unknown> = Object.create(null)
const variableVersions = new Map<string, number>()
const runtimeSubscribers = new Set<RuntimeSubscriber>()
const pendingVariableNames = new Set<string>()

let runtimeConfig: Required<CssxRuntimeConfig> = {
  dimensionsDebounceMs: 0
}
let variableVersion = 0
let dimensions = readWindowDimensions()
let dimensionsVersion = 0
let pendingDimensionsChanged = false
let notifyScheduled = false
let resizeListener: (() => void) | null = null
let resizeTimer: ReturnType<typeof setTimeout> | null = null

export const variables = createVariableProxy(variableValues)
export const defaultVariables = createVariableProxy(defaultVariableValues)

export function setDefaultVariables (next: Record<string, unknown>): void {
  const changed = new Set<string>()
  for (const name of Object.keys(defaultVariableValues)) {
    if (!Object.prototype.hasOwnProperty.call(next, name)) {
      delete defaultVariableValues[name]
      changed.add(name)
    }
  }

  for (const [name, value] of Object.entries(next)) {
    if (Object.is(defaultVariableValues[name], value)) continue
    defaultVariableValues[name] = value
    changed.add(name)
  }

  markVariablesChanged(Array.from(changed))
}

export function getVariableValues (): Record<string, unknown> {
  return variableValues
}

export function getDefaultVariableValues (): Record<string, unknown> {
  return defaultVariableValues
}

export function getVariableVersion (name: string): number {
  return variableVersions.get(name) ?? 0
}

export function getRuntimeVersion (): number {
  return variableVersion + dimensionsVersion
}

export function createDependencySnapshot (): CssxDependencySnapshot {
  return {
    vars: new Map(),
    media: new Map(),
    dimensionsVersion: null
  }
}

export function getDimensions (): { width: number, height: number } {
  return dimensions
}

export function getDimensionsVersion (): number {
  return dimensionsVersion
}

export function setDimensionsForTests (next: { width: number, height: number }): void {
  applyDimensions(next)
}

export function evaluateMediaQuery (query: string): boolean {
  const normalized = stripMediaPrefix(query)

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia(normalized).matches
  }

  try {
    return mediaQuery.match(normalized, {
      type: 'screen',
      width: `${dimensions.width}px`,
      height: `${dimensions.height}px`
    })
  } catch {
    return false
  }
}

export function setRuntimeConfig (next: CssxRuntimeConfig): void {
  runtimeConfig = {
    ...runtimeConfig,
    ...next
  }
}

export function getRuntimeConfig (): Required<CssxRuntimeConfig> {
  return runtimeConfig
}

export function subscribeRuntimeStore (
  listener: (change: RuntimeChangeSnapshot) => void,
  getDependencies: () => CssxDependencySnapshot
): () => void {
  const subscriber = { listener, getDependencies }
  runtimeSubscribers.add(subscriber)
  ensureWindowResizeListener()

  return () => {
    runtimeSubscribers.delete(subscriber)
    if (runtimeSubscribers.size === 0) removeWindowResizeListener()
  }
}

export function hasStaleDependencies (dependencies: CssxDependencySnapshot): boolean {
  for (const [name, version] of dependencies.vars) {
    if (getVariableVersion(name) !== version) return true
  }

  if (
    dependencies.dimensionsVersion != null &&
    dependencies.dimensionsVersion !== dimensionsVersion
  ) {
    return true
  }

  for (const [query, matches] of dependencies.media) {
    if (evaluateMediaQuery(query) !== matches) return true
  }

  return false
}

export function subscribeVariablesForTests (
  names: readonly string[],
  listener: (changedNames: readonly string[]) => void
): () => void {
  const dependencies = createDependencySnapshot()
  for (const name of names) {
    dependencies.vars.set(name, getVariableVersion(name))
  }
  return subscribeRuntimeStore(
    change => listener(change.vars),
    () => dependencies
  )
}

export function getRuntimeSubscriberCountForTests (): number {
  return runtimeSubscribers.size
}

export async function flushMicrotasksForTests (): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}

export function resetStoreForTests (): void {
  clearRecord(variableValues)
  clearRecord(defaultVariableValues)
  variableVersions.clear()
  pendingVariableNames.clear()
  variableVersion = 0
  dimensions = FALLBACK_DIMENSIONS
  dimensionsVersion = 0
  pendingDimensionsChanged = false
  notifyScheduled = false
  runtimeSubscribers.clear()
  removeWindowResizeListener()
}

function createVariableProxy (target: Record<string, unknown>): Record<string, unknown> {
  return new Proxy(target, {
    set (record, property, value) {
      if (typeof property !== 'string') {
        return Reflect.set(record, property, value)
      }
      if (Object.is(record[property], value)) return true
      record[property] = value
      markVariablesChanged([property])
      return true
    },
    deleteProperty (record, property) {
      if (typeof property !== 'string') {
        return Reflect.deleteProperty(record, property)
      }
      if (!Object.prototype.hasOwnProperty.call(record, property)) return true
      delete record[property]
      markVariablesChanged([property])
      return true
    }
  })
}

function markVariablesChanged (names: readonly string[]): void {
  if (names.length === 0) return

  for (const name of names) {
    variableVersion += 1
    variableVersions.set(name, variableVersion)
    pendingVariableNames.add(name)
  }

  scheduleNotification()
}

function applyDimensions (next: { width: number, height: number }): void {
  if (
    Object.is(dimensions.width, next.width) &&
    Object.is(dimensions.height, next.height)
  ) {
    return
  }

  dimensions = next
  dimensionsVersion += 1
  pendingDimensionsChanged = true
  scheduleNotification()
}

function scheduleNotification (): void {
  if (notifyScheduled) return
  notifyScheduled = true

  queueMicrotask(() => {
    notifyScheduled = false
    flushNotifications()
  })
}

function flushNotifications (): void {
  const vars = Array.from(pendingVariableNames)
  const dimensionsChanged = pendingDimensionsChanged

  pendingVariableNames.clear()
  pendingDimensionsChanged = false

  if (vars.length === 0 && !dimensionsChanged) return

  const change = { vars, dimensions: dimensionsChanged }

  for (const subscriber of Array.from(runtimeSubscribers)) {
    if (shouldNotifySubscriber(subscriber.getDependencies(), change)) {
      subscriber.listener(change)
    }
  }
}

function shouldNotifySubscriber (
  dependencies: CssxDependencySnapshot,
  change: RuntimeChangeSnapshot
): boolean {
  for (const name of change.vars) {
    if (dependencies.vars.has(name)) return true
  }

  if (!change.dimensions) return false
  if (dependencies.dimensionsVersion != null) return true

  for (const [query, matches] of dependencies.media) {
    if (evaluateMediaQuery(query) !== matches) return true
  }

  return false
}

function ensureWindowResizeListener (): void {
  if (resizeListener != null || typeof window === 'undefined') return

  resizeListener = () => {
    const hasPendingTrailingUpdate = resizeTimer != null
    if (resizeTimer != null) clearTimeout(resizeTimer)

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

function removeWindowResizeListener (): void {
  if (resizeTimer != null) {
    clearTimeout(resizeTimer)
    resizeTimer = null
  }

  if (resizeListener == null || typeof window === 'undefined') {
    resizeListener = null
    return
  }

  window.removeEventListener('resize', resizeListener)
  resizeListener = null
}

function readWindowDimensions (): { width: number, height: number } {
  if (typeof window === 'undefined') return FALLBACK_DIMENSIONS

  return {
    width: window.innerWidth || FALLBACK_DIMENSIONS.width,
    height: window.innerHeight || FALLBACK_DIMENSIONS.height
  }
}

function stripMediaPrefix (query: string): string {
  return query.trim().replace(/^@media\s+/i, '').trim()
}

function clearRecord (record: Record<string, unknown>): void {
  for (const key of Object.keys(record)) {
    delete record[key]
  }
}
