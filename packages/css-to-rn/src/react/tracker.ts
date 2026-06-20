import type { CompiledCssSheet } from '../types.ts'
import {
  createCssxCache,
  type CssxCache
} from '../resolve.ts'
import {
  createDependencySnapshot,
  hasStaleDependencies,
  subscribeRuntimeStore,
  type CssxDependencyCollector,
  type CssxDependencySnapshot,
  type RuntimeChangeSnapshot
} from './store.ts'

const TRACKED_SHEET = Symbol.for('cssx.trackedSheet')

export interface TrackedCssxSheetOptions {
  target?: 'react-native' | 'web'
  values?: readonly unknown[]
  cacheMaxEntries?: number
}

export class TrackedCssxSheet implements CssxDependencyCollector {
  readonly [TRACKED_SHEET] = true

  private sheet: CompiledCssSheet
  private options: TrackedCssxSheetOptions
  private pendingDependencies: CssxDependencySnapshot | null = null
  private committedDependencies = createDependencySnapshot()
  private listeners = new Set<() => void>()
  private unsubscribeRuntimeStore: (() => void) | null = null
  private snapshotVersion = 0
  private cache: CssxCache

  constructor (sheet: CompiledCssSheet, options: TrackedCssxSheetOptions = {}) {
    this.sheet = sheet
    this.options = options
    this.cache = createCssxCache({ maxEntries: options.cacheMaxEntries })
  }

  getSheet (): CompiledCssSheet {
    return this.sheet
  }

  getOptions (): TrackedCssxSheetOptions {
    return this.options
  }

  getCache (): CssxCache {
    return this.cache
  }

  update (sheet: CompiledCssSheet, options: TrackedCssxSheetOptions = {}): void {
    this.sheet = sheet
    this.options = options
    if (options.cacheMaxEntries !== this.cache.maxEntries) {
      this.cache.maxEntries = options.cacheMaxEntries ?? this.cache.maxEntries
    }
  }

  startRender (): void {
    this.pendingDependencies = createDependencySnapshot()
  }

  commitRender (): void {
    if (this.pendingDependencies == null) return

    const nextDependencies = this.pendingDependencies
    this.pendingDependencies = null
    this.committedDependencies = nextDependencies

    if (hasStaleDependencies(nextDependencies)) {
      this.emitChange()
    }
  }

  recordVariable (name: string, version: number): void {
    this.pendingDependencies?.vars.set(name, version)
  }

  recordMedia (query: string, matches: boolean): void {
    this.pendingDependencies?.media.set(query, matches)
  }

  recordDimensions (version: number): void {
    if (this.pendingDependencies == null) return
    this.pendingDependencies.dimensionsVersion = version
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)

    if (this.unsubscribeRuntimeStore == null) {
      this.unsubscribeRuntimeStore = subscribeRuntimeStore(
        this.handleRuntimeChange,
        () => this.committedDependencies
      )
    }

    return () => {
      this.listeners.delete(listener)

      if (this.listeners.size === 0 && this.unsubscribeRuntimeStore != null) {
        this.unsubscribeRuntimeStore()
        this.unsubscribeRuntimeStore = null
      }
    }
  }

  getSnapshot = (): number => {
    return this.snapshotVersion
  }

  getServerSnapshot = (): number => {
    return this.snapshotVersion
  }

  getCommittedDependenciesForTests (): CssxDependencySnapshot {
    return cloneDependencySnapshot(this.committedDependencies)
  }

  getPendingDependenciesForTests (): CssxDependencySnapshot | null {
    return this.pendingDependencies == null
      ? null
      : cloneDependencySnapshot(this.pendingDependencies)
  }

  private handleRuntimeChange = (_change: RuntimeChangeSnapshot): void => {
    this.emitChange()
  }

  private emitChange (): void {
    this.snapshotVersion += 1
    for (const listener of Array.from(this.listeners)) {
      listener()
    }
  }
}

export function isTrackedCssxSheet (value: unknown): value is TrackedCssxSheet {
  return Boolean(
    value != null &&
    typeof value === 'object' &&
    (value as { [TRACKED_SHEET]?: true })[TRACKED_SHEET] === true
  )
}

export function createTrackedCssxSheet (
  sheet: CompiledCssSheet,
  options: TrackedCssxSheetOptions = {}
): TrackedCssxSheet {
  return new TrackedCssxSheet(sheet, options)
}

function cloneDependencySnapshot (
  input: CssxDependencySnapshot
): CssxDependencySnapshot {
  return {
    vars: new Map(input.vars),
    media: new Map(input.media),
    dimensionsVersion: input.dimensionsVersion
  }
}
