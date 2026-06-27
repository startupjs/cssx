import type { CompiledCssSheet } from '../types.ts'
import {
  createCssxCache,
  type CssxCache
} from '../resolve.ts'
import {
  createDependencySnapshot,
  hasStaleDependencies,
  retainMediaQuery,
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
  private mediaQueryReleases = new Map<string, () => void>()
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

  matches (sheet: CompiledCssSheet, options: TrackedCssxSheetOptions = {}): boolean {
    return this.sheet === sheet && sameOptions(this.options, options)
  }

  update (sheet: CompiledCssSheet, options: TrackedCssxSheetOptions = {}): void {
    this.sheet = sheet
    this.options = options
    if (options.cacheMaxEntries !== this.cache.maxEntries) {
      this.cache.maxEntries = options.cacheMaxEntries ?? this.cache.maxEntries
    }
  }

  startRender (): CssxDependencySnapshot {
    this.pendingDependencies = createDependencySnapshot()
    return this.pendingDependencies
  }

  commitRender (dependencies: CssxDependencySnapshot | null = this.pendingDependencies): void {
    if (dependencies == null) return

    if (this.pendingDependencies === dependencies) {
      this.pendingDependencies = null
    }
    this.committedDependencies = dependencies
    this.syncMediaQuerySubscriptions()

    if (hasStaleDependencies(dependencies)) {
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
      this.syncMediaQuerySubscriptions()
    }

    return () => {
      this.listeners.delete(listener)

      if (this.listeners.size === 0 && this.unsubscribeRuntimeStore != null) {
        this.unsubscribeRuntimeStore()
        this.unsubscribeRuntimeStore = null
        this.releaseMediaQuerySubscriptions()
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

  private syncMediaQuerySubscriptions (): void {
    if (this.unsubscribeRuntimeStore == null) return

    const nextQueries = new Set(this.committedDependencies.media.keys())
    for (const [query, release] of Array.from(this.mediaQueryReleases)) {
      if (nextQueries.has(query)) continue
      release()
      this.mediaQueryReleases.delete(query)
    }

    for (const query of nextQueries) {
      if (this.mediaQueryReleases.has(query)) continue
      this.mediaQueryReleases.set(query, retainMediaQuery(query))
    }
  }

  private releaseMediaQuerySubscriptions (): void {
    for (const release of this.mediaQueryReleases.values()) {
      release()
    }
    this.mediaQueryReleases.clear()
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

function sameOptions (
  left: TrackedCssxSheetOptions,
  right: TrackedCssxSheetOptions
): boolean {
  const keys = new Set([
    ...Object.keys(left),
    ...Object.keys(right)
  ])

  for (const key of keys) {
    const leftValue = left[key as keyof TrackedCssxSheetOptions]
    const rightValue = right[key as keyof TrackedCssxSheetOptions]
    if (key === 'values') {
      if (!sameValues(leftValue as readonly unknown[] | undefined, rightValue as readonly unknown[] | undefined)) {
        return false
      }
      continue
    }
    if (!Object.is(leftValue, rightValue)) return false
  }

  return true
}

function sameValues (
  left: readonly unknown[] | undefined,
  right: readonly unknown[] | undefined
): boolean {
  if (left == null || right == null) return left == null && right == null
  if (left.length !== right.length) return false
  for (let i = 0; i < left.length; i++) {
    if (!Object.is(left[i], right[i])) return false
  }
  return true
}
