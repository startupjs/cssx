export interface CssxRuntimeConfig {
  dimensionsDebounceMs?: number;
}
export interface CssxDimensionsSnapshot {
  width: number;
  height: number;
}
export interface CssxDimensionsAdapter {
  get: () => CssxDimensionsSnapshot;
  subscribe: (listener: () => void) => () => void;
}
export interface CssxDependencySnapshot {
  vars: Map<string, number>;
  media: Map<string, boolean>;
  dimensionsVersion: number | null;
}
export interface CssxDependencyCollector {
  recordVariable: (name: string, version: number) => void;
  recordMedia: (query: string, matches: boolean) => void;
  recordDimensions: (version: number) => void;
}
export interface RuntimeChangeSnapshot {
  vars: readonly string[];
  dimensions: boolean;
}
export declare const variables: Record<string, unknown>
export declare const defaultVariables: Record<string, unknown>
export declare function setDefaultVariables (next: Record<string, unknown>): void
export declare function getVariableValues (): Record<string, unknown>
export declare function getDefaultVariableValues (): Record<string, unknown>
export declare function getVariableVersion (name: string): number
export declare function getRuntimeVersion (): number
export declare function createDependencySnapshot (): CssxDependencySnapshot
export declare function getDimensions (): {
  width: number;
  height: number;
}
export declare function getDimensionsVersion (): number
export declare function setDimensionsForTests (next: {
  width: number;
  height: number;
}): void
export declare function configureDimensionsAdapter (adapter: CssxDimensionsAdapter | null): void
export declare function evaluateMediaQuery (query: string): boolean
export declare function setRuntimeConfig (next: CssxRuntimeConfig): void
export declare function getRuntimeConfig (): Required<CssxRuntimeConfig>
export declare function subscribeRuntimeStore (listener: (change: RuntimeChangeSnapshot) => void, getDependencies: () => CssxDependencySnapshot): () => void
export declare function hasStaleDependencies (dependencies: CssxDependencySnapshot): boolean
export declare function subscribeVariablesForTests (names: readonly string[], listener: (changedNames: readonly string[]) => void): () => void
export declare function getRuntimeSubscriberCountForTests (): number
export declare function flushMicrotasksForTests (): Promise<void>
export declare function resetStoreForTests (): void
