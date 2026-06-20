import type { CompiledCssSheet } from '../types.ts'
import { type CssxCache } from '../resolve.ts'
import { type CssxDependencyCollector, type CssxDependencySnapshot } from './store.ts'
declare const TRACKED_SHEET: unique symbol
export interface TrackedCssxSheetOptions {
  target?: 'react-native' | 'web';
  values?: readonly unknown[];
  cacheMaxEntries?: number;
}
export declare class TrackedCssxSheet implements CssxDependencyCollector {
  readonly [TRACKED_SHEET] = true
  private sheet
  private options
  private pendingDependencies
  private committedDependencies
  private listeners
  private unsubscribeRuntimeStore
  private snapshotVersion
  private cache
  constructor (sheet: CompiledCssSheet, options?: TrackedCssxSheetOptions)
  getSheet (): CompiledCssSheet
  getOptions (): TrackedCssxSheetOptions
  getCache (): CssxCache
  update (sheet: CompiledCssSheet, options?: TrackedCssxSheetOptions): void
  startRender (): CssxDependencySnapshot
  commitRender (dependencies?: CssxDependencySnapshot | null): void
  recordVariable (name: string, version: number): void
  recordMedia (query: string, matches: boolean): void
  recordDimensions (version: number): void
  subscribe: (listener: () => void) => (() => void)
  getSnapshot: () => number
  getServerSnapshot: () => number
  getCommittedDependenciesForTests (): CssxDependencySnapshot
  getPendingDependenciesForTests (): CssxDependencySnapshot | null
  private handleRuntimeChange
  private emitChange
}
export declare function isTrackedCssxSheet (value: unknown): value is TrackedCssxSheet
export declare function createTrackedCssxSheet (sheet: CompiledCssSheet, options?: TrackedCssxSheetOptions): TrackedCssxSheet
export {}
