import mediaQuery from 'css-mediaquery'

export interface CssxRuntimeConfig {
  dimensionsDebounceMs?: number
}

export interface CssxDimensionsSnapshot {
  width: number
  height: number
}

export interface CssxDimensionsAdapter {
  get: () => CssxDimensionsSnapshot
  subscribe: (listener: () => void) => () => void
}

export interface CssxMediaQueryAdapter {
  evaluate: (query: string) => boolean
  subscribe?: (query: string, listener: () => void) => () => void
}

export type CssxColorScheme = 'light' | 'dark'

export interface CssxColorSchemeAdapter {
  get: () => CssxColorScheme | null | undefined
  subscribe: (listener: () => void) => () => void
}

export interface CssxThemeStorageAdapter {
  get: () => string | null | undefined | Promise<string | null | undefined>
  set: (theme: string) => void | Promise<void>
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
  media: boolean
}

export interface CssxVariableStore extends Record<string, unknown> {
  set: (next: Record<string, unknown>) => void
  assign: (next: Record<string, unknown>) => void
  clear: () => void
}

type RuntimeSubscriber = {
  listener: (change: RuntimeChangeSnapshot) => void
  getDependencies: () => CssxDependencySnapshot
}

const FALLBACK_DIMENSIONS = { width: 1024, height: 768 }
const CSS_VARIABLE_NAME_RE = /^--[A-Za-z0-9_-]+$/

const variableValues: Record<string, unknown> = Object.create(null)
const defaultVariableValues: Record<string, unknown> = Object.create(null)
const variableVersions = new Map<string, number>()
const runtimeSubscribers = new Set<RuntimeSubscriber>()
const colorSchemeSubscribers = new Set<() => void>()
const themePreferenceSubscribers = new Set<() => void>()
const pendingVariableNames = new Set<string>()
const retainedMediaQueries = new Map<string, {
  count: number
  unsubscribe: (() => void) | null
}>()

let runtimeConfig: Required<CssxRuntimeConfig> = {
  dimensionsDebounceMs: 0
}
let variableVersion = 0
let dimensionsAdapter: CssxDimensionsAdapter | null = null
let dimensionsAdapterUnsubscribe: (() => void) | null = null
let mediaQueryAdapter: CssxMediaQueryAdapter | null = null
let colorSchemeAdapter: CssxColorSchemeAdapter | null = null
let colorSchemeAdapterUnsubscribe: (() => void) | null = null
let colorScheme = readColorScheme()
let colorSchemeVersion = 0
let themeStorageAdapter: CssxThemeStorageAdapter | null = null
let themeStorageLoadToken = 0
let themePreference = 'auto'
let dimensions = readWindowDimensions()
let dimensionsVersion = 0
let pendingDimensionsChanged = false
let pendingMediaChanged = false
let notifyScheduled = false
let resizeListener: (() => void) | null = null
let resizeTimer: ReturnType<typeof setTimeout> | null = null

export const variables = createVariableProxy(variableValues)
export const defaultVariables = createVariableProxy(defaultVariableValues)

export function setDefaultVariables (next: Record<string, unknown>): void {
  defaultVariables.set(next)
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

export function configureDimensionsAdapter (
  adapter: CssxDimensionsAdapter | null
): void {
  if (dimensionsAdapter === adapter) return
  removeWindowResizeListener()
  dimensionsAdapter = adapter
  refreshRetainedMediaQueryListeners()
  applyDimensions(readWindowDimensions())
  if (runtimeSubscribers.size > 0) ensureWindowResizeListener()
}

export function configureMediaQueryAdapter (
  adapter: CssxMediaQueryAdapter | null
): void {
  if (mediaQueryAdapter === adapter) return
  mediaQueryAdapter = adapter
  refreshRetainedMediaQueryListeners()
  markMediaChanged()
}

export function configureColorSchemeAdapter (
  adapter: CssxColorSchemeAdapter | null
): void {
  if (colorSchemeAdapter === adapter) return
  removeColorSchemeListener()
  colorSchemeAdapter = adapter
  applyColorScheme(readColorScheme())
  if (colorSchemeSubscribers.size > 0) ensureColorSchemeListener()
}

export function configureThemeStorageAdapter (
  adapter: CssxThemeStorageAdapter | null
): void {
  themeStorageAdapter = adapter
  const loadToken = ++themeStorageLoadToken
  if (adapter == null) return

  Promise.resolve(adapter.get()).then(value => {
    if (loadToken !== themeStorageLoadToken) return
    if (typeof value !== 'string' || value.trim() === '') return
    applyThemePreference(value, false)
  }).catch(noop)
}

export function getColorScheme (): CssxColorScheme {
  return colorScheme
}

export function getColorSchemeVersion (): number {
  return colorSchemeVersion
}

export function setColorSchemeForTests (next: CssxColorScheme): void {
  applyColorScheme(next)
}

export function subscribeColorScheme (
  listener: () => void
): () => void {
  colorSchemeSubscribers.add(listener)
  ensureColorSchemeListener()

  return () => {
    colorSchemeSubscribers.delete(listener)
    if (colorSchemeSubscribers.size === 0) removeColorSchemeListener()
  }
}

export function getThemePreference (): string {
  return themePreference
}

export function setThemePreference (next: string): void {
  applyThemePreference(next, true)
}

export function subscribeThemePreference (
  listener: () => void
): () => void {
  themePreferenceSubscribers.add(listener)

  return () => {
    themePreferenceSubscribers.delete(listener)
  }
}

export function getMediaQueryEvaluator (): (query: string) => boolean {
  return query => evaluateMediaQuery(query)
}

export function evaluateMediaQuery (query: string): boolean {
  const normalized = stripMediaPrefix(query)

  if (mediaQueryAdapter != null) {
    return mediaQueryAdapter.evaluate(normalized)
  }

  if (canUseBrowserMatchMedia()) {
    return window.matchMedia(normalized).matches
  }

  try {
    return mediaQuery.match(normalized, mediaValues(dimensions))
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

export function retainMediaQuery (query: string): () => void {
  const normalized = stripMediaPrefix(query)
  let entry = retainedMediaQueries.get(normalized)

  if (entry == null) {
    entry = {
      count: 0,
      unsubscribe: subscribeToMediaQuery(normalized)
    }
    retainedMediaQueries.set(normalized, entry)
  }

  entry.count += 1

  return () => {
    const current = retainedMediaQueries.get(normalized)
    if (current == null) return

    current.count -= 1
    if (current.count > 0) return

    current.unsubscribe?.()
    retainedMediaQueries.delete(normalized)
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
  removeWindowResizeListener()
  releaseAllRetainedMediaQueries()
  dimensionsAdapter = null
  mediaQueryAdapter = null
  removeColorSchemeListener()
  colorSchemeAdapter = null
  colorScheme = 'light'
  colorSchemeVersion = 0
  colorSchemeSubscribers.clear()
  themeStorageAdapter = null
  themeStorageLoadToken += 1
  themePreference = 'auto'
  themePreferenceSubscribers.clear()
  dimensions = FALLBACK_DIMENSIONS
  dimensionsVersion = 0
  pendingDimensionsChanged = false
  pendingMediaChanged = false
  notifyScheduled = false
  runtimeSubscribers.clear()
}

function createVariableProxy (target: Record<string, unknown>): CssxVariableStore {
  const methods = {
    set (next: Record<string, unknown>): void {
      replaceVariables(target, next)
    },
    assign (next: Record<string, unknown>): void {
      assignVariables(target, next)
    },
    clear (): void {
      replaceVariables(target, {})
    }
  }

  return new Proxy(target, {
    get (record, property, receiver) {
      if (property === 'set') return methods.set
      if (property === 'assign') return methods.assign
      if (property === 'clear') return methods.clear
      return Reflect.get(record, property, receiver)
    },
    has (record, property) {
      return property === 'set' ||
        property === 'assign' ||
        property === 'clear' ||
        Reflect.has(record, property)
    },
    set (record, property, value) {
      if (typeof property !== 'string') {
        return Reflect.set(record, property, value)
      }
      assertCssVariableName(property)
      if (Object.is(record[property], value)) return true
      record[property] = value
      markVariablesChanged([property])
      return true
    },
    deleteProperty (record, property) {
      if (typeof property !== 'string') {
        return Reflect.deleteProperty(record, property)
      }
      assertCssVariableName(property)
      if (!Object.prototype.hasOwnProperty.call(record, property)) return true
      delete record[property]
      markVariablesChanged([property])
      return true
    }
  }) as CssxVariableStore
}

function replaceVariables (
  target: Record<string, unknown>,
  next: Record<string, unknown>
): void {
  const changed = new Set<string>()
  for (const name of Object.keys(next)) assertCssVariableName(name)

  for (const name of Object.keys(target)) {
    if (!Object.prototype.hasOwnProperty.call(next, name)) {
      delete target[name]
      changed.add(name)
    }
  }

  for (const [name, value] of Object.entries(next)) {
    if (Object.is(target[name], value)) continue
    target[name] = value
    changed.add(name)
  }

  markVariablesChanged(Array.from(changed))
}

function assignVariables (
  target: Record<string, unknown>,
  next: Record<string, unknown>
): void {
  const changed = new Set<string>()

  for (const [name, value] of Object.entries(next)) {
    assertCssVariableName(name)
    if (Object.is(target[name], value)) continue
    target[name] = value
    changed.add(name)
  }

  markVariablesChanged(Array.from(changed))
}

function assertCssVariableName (name: string): void {
  if (CSS_VARIABLE_NAME_RE.test(name)) return
  throw new TypeError(`Invalid CSS custom property name "${name}". CSSX variables must start with "--".`)
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

function applyColorScheme (next: CssxColorScheme | null | undefined): void {
  const normalized = next === 'dark' ? 'dark' : 'light'
  if (colorScheme === normalized) return
  colorScheme = normalized
  colorSchemeVersion += 1
  for (const listener of Array.from(colorSchemeSubscribers)) {
    listener()
  }
}

function applyThemePreference (next: string, persist: boolean): void {
  const normalized = normalizeThemePreference(next)
  if (themePreference === normalized) return
  themePreference = normalized

  if (persist) {
    Promise.resolve(themeStorageAdapter?.set(normalized)).catch(noop)
  }

  for (const listener of Array.from(themePreferenceSubscribers)) {
    listener()
  }
}

function normalizeThemePreference (next: string): string {
  if (typeof next !== 'string') {
    throw new TypeError('CSSX theme must be a string.')
  }
  const normalized = next.trim()
  if (normalized) return normalized
  throw new TypeError('CSSX theme must be a non-empty string.')
}

function noop (): void {}

function markMediaChanged (): void {
  pendingMediaChanged = true
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
  const mediaChanged = pendingMediaChanged

  pendingVariableNames.clear()
  pendingDimensionsChanged = false
  pendingMediaChanged = false

  if (vars.length === 0 && !dimensionsChanged && !mediaChanged) return

  const change = {
    vars,
    dimensions: dimensionsChanged,
    media: mediaChanged
  }

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

  if (change.dimensions && dependencies.dimensionsVersion != null) return true

  if (change.dimensions || change.media) {
    for (const [query, matches] of dependencies.media) {
      if (evaluateMediaQuery(query) !== matches) return true
    }
  }

  return false
}

function refreshRetainedMediaQueryListeners (): void {
  for (const entry of retainedMediaQueries.values()) {
    entry.unsubscribe?.()
    entry.unsubscribe = null
  }

  for (const [query, entry] of retainedMediaQueries) {
    if (entry.count > 0) entry.unsubscribe = subscribeToMediaQuery(query)
  }
}

function releaseAllRetainedMediaQueries (): void {
  for (const entry of retainedMediaQueries.values()) {
    entry.unsubscribe?.()
  }
  retainedMediaQueries.clear()
}

function subscribeToMediaQuery (query: string): (() => void) | null {
  if (mediaQueryAdapter?.subscribe != null) {
    return mediaQueryAdapter.subscribe(query, markMediaChanged)
  }

  if (!canUseBrowserMatchMedia()) return null

  const media = window.matchMedia(query)
  const listener = () => {
    markMediaChanged()
  }

  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', listener)
    return () => {
      media.removeEventListener('change', listener)
    }
  }

  media.addListener(listener)
  return () => {
    media.removeListener(listener)
  }
}

function ensureWindowResizeListener (): void {
  if (dimensionsAdapter != null) {
    if (dimensionsAdapterUnsubscribe != null) return
    dimensionsAdapterUnsubscribe = dimensionsAdapter.subscribe(() => {
      applyDimensions(readWindowDimensions())
    })
    applyDimensions(readWindowDimensions())
    return
  }

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

function readWindowDimensions (): { width: number, height: number } {
  if (dimensionsAdapter != null) return dimensionsAdapter.get()

  if (typeof window === 'undefined') return FALLBACK_DIMENSIONS

  return {
    width: window.innerWidth || FALLBACK_DIMENSIONS.width,
    height: window.innerHeight || FALLBACK_DIMENSIONS.height
  }
}

function readColorScheme (): CssxColorScheme {
  if (colorSchemeAdapter != null) {
    return colorSchemeAdapter.get() === 'dark' ? 'dark' : 'light'
  }

  if (canUseBrowserMatchMedia() && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }

  return 'light'
}

function ensureColorSchemeListener (): void {
  if (colorSchemeAdapter != null) {
    if (colorSchemeAdapterUnsubscribe != null) return
    colorSchemeAdapterUnsubscribe = colorSchemeAdapter.subscribe(() => {
      applyColorScheme(readColorScheme())
    })
    applyColorScheme(readColorScheme())
    return
  }

  if (!canUseBrowserMatchMedia() || colorSchemeAdapterUnsubscribe != null) return

  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const listener = () => {
    applyColorScheme(readColorScheme())
  }

  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', listener)
    colorSchemeAdapterUnsubscribe = () => {
      media.removeEventListener('change', listener)
    }
    return
  }

  media.addListener(listener)
  colorSchemeAdapterUnsubscribe = () => {
    media.removeListener(listener)
  }
}

function removeColorSchemeListener (): void {
  if (colorSchemeAdapterUnsubscribe == null) return
  colorSchemeAdapterUnsubscribe()
  colorSchemeAdapterUnsubscribe = null
}

function canUseBrowserMatchMedia (): boolean {
  return (
    dimensionsAdapter == null &&
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function'
  )
}

function stripMediaPrefix (query: string): string {
  return query.trim().replace(/^@media\s+/i, '').trim()
}

function mediaValues (next: { width: number, height: number }): Record<string, unknown> {
  return {
    type: 'screen',
    width: `${next.width}px`,
    height: `${next.height}px`,
    'device-width': `${next.width}px`,
    'device-height': `${next.height}px`,
    orientation: next.width >= next.height ? 'landscape' : 'portrait'
  }
}

function clearRecord (record: Record<string, unknown>): void {
  for (const key of Object.keys(record)) {
    delete record[key]
  }
}
