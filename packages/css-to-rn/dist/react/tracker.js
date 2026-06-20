import { createCssxCache } from '../resolve.js'
import { createDependencySnapshot, hasStaleDependencies, subscribeRuntimeStore } from './store.js'
const TRACKED_SHEET = Symbol.for('cssx.trackedSheet')
export class TrackedCssxSheet {
  [TRACKED_SHEET] = true
  sheet
  options
  pendingDependencies = null
  committedDependencies = createDependencySnapshot()
  listeners = new Set()
  unsubscribeRuntimeStore = null
  snapshotVersion = 0
  cache
  constructor (sheet, options = {}) {
    this.sheet = sheet
    this.options = options
    this.cache = createCssxCache({ maxEntries: options.cacheMaxEntries })
  }

  getSheet () {
    return this.sheet
  }

  getOptions () {
    return this.options
  }

  getCache () {
    return this.cache
  }

  update (sheet, options = {}) {
    this.sheet = sheet
    this.options = options
    if (options.cacheMaxEntries !== this.cache.maxEntries) {
      this.cache.maxEntries = options.cacheMaxEntries ?? this.cache.maxEntries
    }
  }

  startRender () {
    this.pendingDependencies = createDependencySnapshot()
    return this.pendingDependencies
  }

  commitRender (dependencies = this.pendingDependencies) {
    if (dependencies == null) { return }
    if (this.pendingDependencies === dependencies) {
      this.pendingDependencies = null
    }
    this.committedDependencies = dependencies
    if (hasStaleDependencies(dependencies)) {
      this.emitChange()
    }
  }

  recordVariable (name, version) {
    this.pendingDependencies?.vars.set(name, version)
  }

  recordMedia (query, matches) {
    this.pendingDependencies?.media.set(query, matches)
  }

  recordDimensions (version) {
    if (this.pendingDependencies == null) { return }
    this.pendingDependencies.dimensionsVersion = version
  }

  subscribe = (listener) => {
    this.listeners.add(listener)
    if (this.unsubscribeRuntimeStore == null) {
      this.unsubscribeRuntimeStore = subscribeRuntimeStore(this.handleRuntimeChange, () => this.committedDependencies)
    }
    return () => {
      this.listeners.delete(listener)
      if (this.listeners.size === 0 && this.unsubscribeRuntimeStore != null) {
        this.unsubscribeRuntimeStore()
        this.unsubscribeRuntimeStore = null
      }
    }
  }

  getSnapshot = () => {
    return this.snapshotVersion
  }

  getServerSnapshot = () => {
    return this.snapshotVersion
  }

  getCommittedDependenciesForTests () {
    return cloneDependencySnapshot(this.committedDependencies)
  }

  getPendingDependenciesForTests () {
    return this.pendingDependencies == null
      ? null
      : cloneDependencySnapshot(this.pendingDependencies)
  }

  handleRuntimeChange = (_change) => {
    this.emitChange()
  }

  emitChange () {
    this.snapshotVersion += 1
    for (const listener of Array.from(this.listeners)) {
      listener()
    }
  }
}
export function isTrackedCssxSheet (value) {
  return Boolean(value != null &&
        typeof value === 'object' &&
        value[TRACKED_SHEET] === true)
}
export function createTrackedCssxSheet (sheet, options = {}) {
  return new TrackedCssxSheet(sheet, options)
}
function cloneDependencySnapshot (input) {
  return {
    vars: new Map(input.vars),
    media: new Map(input.media),
    dimensionsVersion: input.dimensionsVersion
  }
}
