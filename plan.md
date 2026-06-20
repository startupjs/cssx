# Unified CSS-to-RN Engine Plan

This document is the implementation handoff for the CSSX CSS-to-React-Native
pipeline refactor. It captures the agreed architecture, public APIs, internal
IR, runtime tracking model, migration path, and test plan. A new agent should
be able to start from this file and implement the package end to end without
needing the design discussion history.

## Goal

Unify CSS-to-React-Native style transformation into one maintainable package in
this monorepo.

The current implementation is split across:

- `cssx` / this monorepo:
  - Babel transforms
  - Stylus preprocessing
  - runtime selector matching
  - runtime CSS variable substitution
  - media and viewport unit processing
  - teamplay-based caching
- `../css-to-react-native`:
  - low-level CSS declaration to React Native style transformation
  - forked support for `var()`, animations, transitions, keyframes
- `../css-to-react-native-transform`:
  - full CSS parsing
  - selector filtering
  - media query parsing
  - `:part()` selector support
  - keyframe extraction

The new package should replace that split with:

- one canonical CSS compiler IR
- one resolver for static, dynamic, imported, inline, and runtime-generated CSS
- one runtime dependency tracker
- one caching model
- one public API surface re-exported from `cssxjs`

## Non-Goals

These are intentionally out of scope for the first implementation:

- Runtime Stylus compilation. Runtime `compileCss()` accepts pure CSS only.
- Full browser selector support. CSSX remains a class-combination selector
  system.
- Full browser CSS compatibility, prefixing, or old-browser normalization.
- Mandatory PostCSS. Client-side compiler size is important.
- A cssta/styled-components-like component factory API.
- Animation execution hooks/components. CSSX only emits Reanimated v4-compatible
  style props.
- Provider-scoped CSS variables. Variables remain global singleton state for
  now.
- CSS custom property declarations inside stylesheets, such as
  `.root { --x: red }`.
- `:root` custom property defaults.
- Interpolation inside Pug `style` blocks.
- Dynamic `:export` values.

## Research Summary

### Current CSSX

Important files:

- `packages/loaders/cssToReactNativeLoader.js`
- `packages/loaders/stylusToCssLoader.js`
- `packages/loaders/compilers/css.js`
- `packages/loaders/compilers/styl.js`
- `packages/babel-plugin-rn-stylename-inline/index.js`
- `packages/babel-plugin-rn-stylename-to-style/index.js`
- `packages/runtime/process.js`
- `packages/runtime/processCached.js`
- `packages/runtime/matcher.js`
- `packages/runtime/variables.js`
- `packages/runtime/dimensions.js`

Current behavior:

- Inline `css``...`` and `styl``...`` templates are compiled by Babel to style
  objects.
- External `.cssx.css` / `.cssx.styl` imports are compiled by loaders or Babel.
- JSX `styleName` is rewritten to runtime calls.
- Runtime currently handles selector matching, `var()` substitution, media query
  processing, viewport units, `u` unit strings, and optional teamplay caching.
- Expression interpolation inside `css``...`` and `styl``...`` currently throws.

### Forked `css-to-react-native`

Useful pieces:

- property transformers
- `TokenStream`
- animation and transition transforms
- keyframe object inlining behavior
- shorthand behavior and tests

Do not preserve its architecture blindly. In the new engine, `var()` should be
resolved before property transformation, so the transformer should no longer
need unresolved `VARIABLE` tokens spread through every parser.

### Forked `css-to-react-native-transform`

Useful pieces:

- current CSS parser usage
- media query validation
- selector filtering constraints
- existing legacy output shape
- tests for parts, media, keyframes, viewport units

The new package should replace the old nested object output with canonical
rule/declaration IR.

### cssta

Useful inspiration:

- template expression placeholder extraction
- preserving dynamic declarations as tuples until runtime
- splitting compile-time static work from runtime style tuple resolution

Not reused:

- component factory API
- React context variable model
- hook-based animation execution

### Parser Size Decision

PostCSS is not the default parser foundation because of client bundle size.

Measured browser bundle baseline with esbuild:

```text
current stack:
css/lib/parse + postcss-value-parser + css-mediaquery + helpers
15.8 KB minified, 6.2 KB gzip

PostCSS stack:
postcss + postcss-selector-parser + postcss-value-parser + css-mediaquery + helpers
128.0 KB minified, 36.1 KB gzip
```

Use the lightweight stack:

- `css/lib/parse` or an equivalent small stylesheet parser
- `postcss-value-parser` for values
- `css-mediaquery` or a small compatible evaluator/parser
- custom narrow selector parser/validator

## Target Package

Create:

```text
packages/css-to-rn/
```

Package name:

```text
@cssxjs/css-to-rn
```

It is the unified engine package. The public `cssxjs` package re-exports the
user-facing APIs.

### Package Boundaries

`@cssxjs/css-to-rn` root export:

- framework-independent compiler and resolver
- no React imports
- no React Native imports
- no Reanimated imports

`@cssxjs/css-to-rn/react` and platform subpaths:

- React hooks and tracked wrapper runtime
- optional peer dependency on `react`
- optional peer dependency on `react-native`
- conditional exports for web vs React Native

`cssxjs`:

- public facade used by users
- re-exports `css`, `styl`, `pug`
- re-exports `compileCss`, `cssx`, `useCompiledCss`, `CssxProvider`,
  `configureCssx`, `variables`, `setDefaultVariables`, `defaultVariables`
- keeps conditional runtime entrypoints so Expo/RN picks the RN target
  automatically and web picks the default target

`@cssxjs/runtime`:

- currently internal in practice
- can be collapsed, removed, or left as a compatibility wrapper after migration
- should not keep duplicate selector/var/media/cache implementation long term

### TypeScript

Write the new package in TypeScript from the start.

Use Node-strip-friendly TypeScript, following the pattern in
`../teamplay/tsconfig.json`:

- `type: "module"`
- `target: "esnext"`
- `module: "nodenext"`
- `moduleResolution: "nodenext"`
- `rewriteRelativeImportExtensions: true`
- `erasableSyntaxOnly: true`
- `verbatimModuleSyntax: true`
- `strict: true`
- `allowImportingTsExtensions: true` for source tests
- explicit `.ts` extensions in source imports
- no enums
- no parameter properties
- no namespaces
- no decorators
- no top-level await

Scope the TS setup to `packages/css-to-rn` initially. Do not modernize the
root repo TS config as part of this plan unless needed later.

Use a custom source condition:

```text
cssx-ts
```

Package exports should follow the Teamplay source-test pattern:

```json
{
  "exports": {
    ".": {
      "cssx-ts": "./src/index.ts",
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./react": {
      "react-native": {
        "cssx-ts": "./src/react-native.ts",
        "types": "./dist/react-native.d.ts",
        "default": "./dist/react-native.js"
      },
      "cssx-ts": "./src/web.ts",
      "types": "./dist/web.d.ts",
      "default": "./dist/web.js"
    },
    "./react-native": {
      "cssx-ts": "./src/react-native.ts",
      "types": "./dist/react-native.d.ts",
      "default": "./dist/react-native.js"
    },
    "./web": {
      "cssx-ts": "./src/web.ts",
      "types": "./dist/web.d.ts",
      "default": "./dist/web.js"
    }
  }
}
```

Adjust file names as implementation settles. The important constraints are:

- root export is framework-independent
- React/RN/web entrypoints are explicit and conditionally resolvable
- source tests can import `.ts` through `-C cssx-ts`
- published package emits `.js` and `.d.ts`

Peer dependencies:

```json
{
  "peerDependencies": {
    "react": "*",
    "react-native": "*"
  },
  "peerDependenciesMeta": {
    "react": { "optional": true },
    "react-native": { "optional": true }
  }
}
```

## Public APIs

### Pure Engine APIs

These live at `@cssxjs/css-to-rn`.

```ts
export function compileCss(
  css: string,
  options?: CompileCssOptions
): CompiledCssSheet

export function compileCssTemplate(
  cssWithDynamicSlots: string,
  options?: CompileCssTemplateOptions
): CompiledCssSheet

export function resolveCssx(
  input: ResolveCssxInput
): ResolveCssxResult

export function transformDeclarations(
  declarations: readonly CssDeclaration[],
  options?: TransformDeclarationOptions
): TransformDeclarationResult

export function toLegacyStyleObject(
  sheet: CompiledCssSheet,
  options?: LegacyOutputOptions
): LegacyStyleObject
```

The exact function names can change, but the package needs these capabilities:

- compile CSS string to canonical IR
- compile CSS string containing dynamic interpolation slots to canonical IR
- resolve style props from one or more compiled sheet layers
- transform resolved declaration values into RN/web style objects
- output the old object shape temporarily for incremental migration

### Runtime React APIs

These live at `@cssxjs/css-to-rn/react`, `@cssxjs/css-to-rn/web`,
`@cssxjs/css-to-rn/react-native`, and are re-exported by `cssxjs`.

```ts
export function cssx(
  styleName: StyleNameValue,
  sheet: CompiledCssSheet | TrackedCssSheet | string | Array<CompiledCssSheet | TrackedCssSheet | string>,
  inlineStyleProps?: InlineStyleProps
): ResolvedStyleProps

export function useCompiledCss(
  css: string,
  options?: CompileCssOptions
): TrackedCssSheet

export function useCssxSheet(
  sheet: CompiledCssSheet | CompiledCssSheet[],
  options?: UseCssxSheetOptions
): TrackedCssSheet | TrackedCssSheet[]

export function useCssxTemplate(
  sheet: CompiledCssSheet,
  values: readonly InterpolationValue[],
  options?: UseCssxTemplateOptions
): TrackedCssSheet

export function CssxProvider(props: {
  value?: CssxRuntimeOptions
  children: React.ReactNode
}): React.ReactNode

export function configureCssx(options: CssxRuntimeOptions): void

export const variables: Record<string, CssVariableValue>
export let defaultVariables: Record<string, CssVariableValue>
export function setDefaultVariables(vars: Record<string, CssVariableValue>): void
```

Public manual runtime CSS usage:

```tsx
import { compileCss, cssx, useCompiledCss } from 'cssxjs'

const sheet = compileCss(generatedCss)

function Button({ disabled, style }) {
  const trackedSheet = useCompiledCss(generatedCss)

  return (
    <Div {...cssx(['root', { disabled }], trackedSheet, { style })} />
  )
}
```

Convenience raw string usage is allowed:

```tsx
<Div {...cssx('root', generatedCss)} />
```

But documented React usage should prefer `useCompiledCss()` so subscriptions,
diagnostics, and parsing are controlled.

### `cssx()` Ergonomics

Do not require a `useCssx()` hook per element. The user should be able to write:

```tsx
const sheet = useCompiledCss(generatedCss)

return (
  <>
    <Div {...cssx('root', sheet)} />
    <Span {...cssx('label', sheet)} />
  </>
)
```

The hook returns a tracked sheet wrapper. `cssx()` is a plain function that
resolves styles and records dependencies into the tracked wrapper during render.
The hook owns the actual React subscription lifecycle.

### Compatibility APIs

`css` and `styl` remain both:

- tagged template markers transformed away by Babel
- spread helpers transformed by Babel when called as functions

The existing user code shape remains:

```tsx
import { css, styl } from 'cssxjs'

function Button({ color }) {
  return <View styleName="root" />

  css`
    .root {
      color: ${color};
    }
  `
}
```

## Compiled Sheet IR

The canonical compiler output must be plain JSON-serializable data:

- no functions
- no Maps
- no Sets
- no Symbols
- no closures
- no runtime cache state

Runtime cache/tracker state should live in WeakMaps or non-enumerable wrapper
objects, not inside the serialized IR.

Approximate shape:

```ts
export interface CompiledCssSheet {
  version: 1
  id: string
  sourceId?: string
  contentHash: string
  rules: CssRule[]
  keyframes: Record<string, CssKeyframe[]>
  exports?: Record<string, string>
  metadata: CssxMetadata
  diagnostics: CssxDiagnostic[]
  error?: CssxDiagnostic
}

export interface CssRule {
  selector: string
  classes: string[]
  part: string | null
  specificity: number
  order: number
  media: string | null
  declarations: CssDeclaration[]
}

export interface CssDeclaration {
  property: string
  value: CssValueAst
  raw: string
  order: number
  dynamicSlots?: number[]
}

export interface CssKeyframe {
  selector: 'from' | 'to' | string
  declarations: CssDeclaration[]
  order: number
}

export interface CssxMetadata {
  hasVars: boolean
  vars: string[]
  hasMedia: boolean
  hasViewportUnits: boolean
  hasInterpolations: boolean
  hasDynamicRuntimeDependencies: boolean
  hasAnimations: boolean
  hasTransitions: boolean
}
```

The exact TypeScript structure can evolve, but these semantic fields are needed.

### IDs And Path Privacy

Compiled sheets need stable hashes:

- build templates/imports:
  - use relative file path and per-file template/import order as hash input
  - do not expose the path in emitted runtime objects
- runtime `compileCss(css)`:
  - use CSS content as hash input

Recommended build hash shape:

```text
sourceId = hash(relativeFilePath + ':' + templateIndex)
contentHash = hash(staticCssContent)
id = hash(sourceId + ':' + contentHash)
```

Runtime objects may expose only hashed IDs:

```ts
{
  id: 'cssx_abc123',
  sourceId: 'cssx_src_def456'
}
```

Do not leak absolute or relative server paths into code delivered publicly.

Build diagnostics can include actual filenames and code frames because those are
developer-only build outputs.

Runtime diagnostics for AI-generated CSS should include sanitized line/column
but no source paths.

## Compiler Behavior

### Modes

`compileCss()` should support separate modes:

```ts
type CompileMode = 'runtime' | 'build'
```

Runtime-safe mode is the default for the public API:

- CSS syntax errors return an empty sheet with structured diagnostics
- dev mode may warn
- production should not crash
- unsupported selectors/rules become diagnostics and are ignored
- invalid declarations become diagnostics and are ignored

Build-strict mode is used by Babel/loaders:

- syntax errors throw
- invalid static declarations throw
- unsupported critical constructs throw when they represent developer source bugs
- errors should include file-aware code frames where possible

For parser syntax errors in runtime mode, return an empty sheet initially. Do not
attempt partial recovery until there is a good reason and tests.

### Diagnostics

Compiled sheets must expose structured diagnostics suitable for tooling and
AI feedback:

```ts
export interface CssxDiagnostic {
  level: 'warning' | 'error'
  code: CssxDiagnosticCode
  message: string
  line?: number
  column?: number
}
```

Use stable machine-readable codes. Initial codes:

```text
CSS_SYNTAX_ERROR
UNSUPPORTED_SELECTOR
UNSUPPORTED_AT_RULE
INVALID_DECLARATION
UNRESOLVED_VARIABLE
VARIABLE_CYCLE
VARIABLE_DEPTH_LIMIT
UNSUPPORTED_INTERPOLATION_POSITION
INVALID_INTERPOLATION_VALUE
UNSUPPORTED_CALC
UNSUPPORTED_BACKGROUND_IMAGE
UNSUPPORTED_BACKGROUND_SHORTHAND
```

Deduplicate dev warnings per stylesheet/declaration/error kind/value pattern to
avoid console spam during repeated renders.

### Source Locations

Runtime IR should not include source maps or full source locations by default.

Runtime diagnostics may include:

- line
- column
- sanitized message

Build tools can use parser locations immediately for code frames, but emitted
runtime objects should stay small and path-free.

## Selector Model

Keep the CSSX selector subset.

Supported:

```css
.root
.root.active
.root:part(label)
.root.active:part(icon)
.root:hover
.root:active
.root.active:hover
:export
```

Unsupported and ignored with dev diagnostics:

```css
.root .child
.root > .child
#id
[type='x']
:nth-child(2)
```

`:hover` and `:active` are aliases for part-style output:

```css
.root:hover  -> hoverStyle
.root:active -> activeStyle
```

They are equivalent targets to:

```css
.root:part(hover)
.root:part(active)
```

If both forms target the same logical part, normal cascade decides the result.
No built-in hover/press state management is included. CSSX only emits
`hoverStyle` / `activeStyle` props for components that consume them.

Specificity remains CSSX class specificity:

- specificity is class count
- part/pseudo aliases do not add browser-style specificity
- within same specificity, later source order wins

## Cascade And Layering

Canonical IR preserves:

- rule order
- declaration order
- selector specificity
- media condition per rule

This is required for browser-like fallback behavior:

```css
.button {
  color: red;
  color: var(--maybe-color);
}
```

If `--maybe-color` is unresolved or invalid at runtime, only the second
declaration is dropped and `color: red` still applies.

Cross-source precedence stays as today:

1. file/imported stylesheet
2. module-level global inline template
3. function-level local inline template
4. inline style props

Model this as ordered sheet layers:

```ts
resolveCssx({
  styleName,
  layers: [fileSheet, globalSheet, localSheet],
  inlineStyleProps
})
```

Within each sheet:

1. match selectors/classes/part
2. filter inactive media rules
3. sort/apply by specificity and source order
4. resolve declarations in order
5. drop invalid declarations

Across sheets, later layers override earlier layers.

Public `cssx()` should accept a single sheet or an array:

```ts
cssx('root', sheet, inlineStyleProps)
cssx('root', [baseSheet, generatedSheet], inlineStyleProps)
```

## Interpolation

Interpolation is supported only in JS tagged templates:

```tsx
css`
  .button {
    color: ${buttonColor};
  }
`

styl`
  .button
    color ${buttonColor}
`
```

It is not supported in:

- external `.cssx.css` / `.cssx.styl` files
- module-level global templates
- Pug `style` blocks
- selectors
- property names
- media queries
- `:export`

Interpolation is allowed only where CSS `var()` can legally appear in
declaration values. It can also interpolate a full `var(...)` string.

### Lowering

Babel lowers template expressions to synthetic `var()`-like tokens before CSS
or Stylus parsing:

```tsx
css`
  .root {
    color: ${color};
    padding: ${pad} 2u;
  }
`
```

becomes a static source equivalent to:

```css
.root {
  color: var(--__cssx_dynamic_0);
  padding: var(--__cssx_dynamic_1) 2u;
}
```

The compiler validates that the synthetic slots appear only inside declaration
values. If a slot appears in a selector, property name, media query, `:export`,
or other unsupported position, build mode throws
`UNSUPPORTED_INTERPOLATION_POSITION`.

For Stylus:

```text
JS template -> synthetic dynamic var tokens -> Stylus -> CSS -> compileCssTemplate()
```

This keeps CSS and Stylus interpolation on one path.

### Runtime Values

Dynamic values are passed as an ordered array in template expression order:

```ts
useCssxTemplate(__sheet, [color, pad])
```

Accepted interpolation values:

```ts
string | number | null | undefined | false
```

Semantics:

- `string`: inserted as raw CSS value text
- `number`: inserted as raw numeric token
- `null`, `undefined`, `false`: invalidate only the containing declaration
- `true`: invalid
- objects, arrays, functions, symbols, bigint: invalid

Invalid interpolation values drop only the containing declaration at runtime and
produce a deduped dev diagnostic.

Interpolation cache equality uses `Object.is` over the primitive value array.
Do not stringify interpolation values.

### Local Templates Only

Interpolations are supported only in function-scoped local templates. This gives
the runtime a clear render lifecycle:

```tsx
function Button({ color }) {
  return <View styleName="root" />

  css`
    .root { color: ${color}; }
  `
}
```

Module-level templates with expressions remain unsupported because they would
require global mutable style state or one-time module initialization semantics.

## Value Resolution

Dynamic values must resolve at the CSS declaration-value layer before RN/web
property transformation.

This is essential for:

```css
box-shadow: var(--shadow);
box-shadow: var(--shadow-1), var(--shadow-2);
box-shadow: var(--x) 2px 8px rgba(0,0,0,var(--alpha));
padding: var(--button-padding, 8px 16px);
border: var(--width) solid var(--color);
transform: translateX(var(--x)) scale(var(--scale));
```

Resolution pipeline:

1. replace interpolation slots
2. recursively resolve nested `var()`
3. resolve/evaluate supported `calc()` and viewport units at the value layer
4. apply `u` unit semantics
5. transform final declaration values into RN/web style props

Implementation can combine steps 3 and 4 internally. The important invariant is
that RN property transformers receive final CSS value strings with no unresolved
`var()` or dynamic slots.

### CSS Variables

CSS variable priority stays:

1. runtime `variables['--name']`
2. `defaultVariables['--name']`
3. inline fallback `var(--name, fallback)`

Nested vars are supported:

```css
color: var(--button-color, var(--theme-color, red));
```

Cycles and runaway recursion are invalid:

```css
var(--a) where --a -> var(--b) and --b -> var(--a)
```

Implement:

- resolving-name stack for cycle detection
- explicit recursion depth limit, for example `20`
- invalid declaration on cycle/depth limit
- deduped dev warning

Unresolved vars invalidate only the containing declaration.

Do not support stylesheet custom property declarations initially:

```css
.root {
  --button-bg: red;
  background: var(--button-bg);
}
```

Do not treat `:root { --x: ... }` as defaults. Ignore with dev warning. Use
`setDefaultVariables()` for defaults.

### `calc()`

Support limited `calc()` where the final expression can be reduced safely after
vars/interpolation/viewport units are resolved:

```css
width: calc(100vw - 16px);
margin-left: calc(var(--spacing, 8px) * 2);
```

Do not attempt full browser layout math:

```css
width: calc(100% - 16px);
```

Unsupported `calc()`:

- throws in build mode if fully static
- drops declaration in runtime mode or if dynamic
- emits `UNSUPPORTED_CALC`

### Viewport Units

Support:

- `vw`
- `vh`
- `vmin`
- `vmax`

Resolve at the declaration-value layer before property transformation. Viewport
unit users depend on debounced dimension changes.

### `u` Unit

Preserve current CSSX semantics:

```text
1u = 8px
```

The new resolver should handle `u` consistently before final RN/web output.

## Media Queries

Store media conditions on rules:

```ts
{
  selector: '.button',
  classes: ['button'],
  part: null,
  specificity: 1,
  order: 4,
  media: '@media (min-width: 600px)',
  declarations: [...]
}
```

Do not use a separate nested style map in canonical IR.

Rule filtering order:

1. match selector/classes/part
2. evaluate media condition
3. resolve active declarations

Inactive media rules must not contribute variable dependencies.

Target optimization:

- media subscribers rerender only when query match result changes
- viewport unit subscribers rerender when debounced dimension values change

First milestone may use a simpler debounced dimension version for all media and
viewport dependencies if needed, but the target should be query-match-based
media invalidation.

Web:

- use `window.matchMedia(query).change` for media query subscriptions when
  available
- use debounced `resize` for viewport units
- SSR/no-window falls back to configured defaults and no-op subscriptions

React Native:

- use `Dimensions` for width/height
- reevaluate query matches after dimension changes

Dimension listener initialization:

- platform entrypoint installs adapter automatically
- actual listeners start lazily on first dimension/media subscription
- listeners stop when last dimension subscriber unsubscribes, if possible

Dimension notification debounce:

- leading notification for immediate rotation/orientation response
- trailing notification after resize settles
- default around `100ms`
- configurable later through provider or singleton config

## Keyframes, Animations, And Transitions

CSSX should emit Reanimated v4-compatible style props only. It should not own
animation execution, hooks, or animated component wrappers.

Users write:

```tsx
import Animated from 'react-native-reanimated'

<Animated.View styleName="myButton" />
```

CSSX emits style props that Reanimated v4 understands.

### Keyframe IR

Store `@keyframes` separately:

```ts
{
  keyframes: {
    fade: [
      { selector: 'from', declarations: [...] },
      { selector: 'to', declarations: [...] }
    ]
  },
  rules: [...]
}
```

Keyframe declarations use the same dynamic value pipeline:

- `var()` supported
- interpolation supported when the keyframes are inside a local interpolated
  template
- invalid dynamic keyframe declarations are dropped at runtime

Animation declarations resolve names to keyframe objects after dynamic value
resolution:

```css
.button {
  animation: fade var(--duration, 200ms) ease;
}
```

Result includes:

```js
{
  animationName: { from: {...}, to: {...} },
  animationDuration: '200ms',
  animationTimingFunction: 'ease'
}
```

Support comma-separated multi-values from the first implementation:

```css
transition: background 0.2s, transform 0.1s, opacity 0.3s;
animation: fadeIn 300ms ease, slideIn 500ms ease-out;
```

## Property Transformation

The property transformer should be designed around final resolved CSS values.
It can selectively reuse code from `../css-to-react-native`, but should not be
constrained by the old architecture.

Keep or add support for:

- all existing supported RN style props
- shorthand expansion
- border shorthand with dynamic width/color/style after var resolution
- padding/margin/border radius/width/color/style shorthands
- transform
- text-shadow
- box-shadow
- animation and transition shorthands/longhands
- keyframe object inlining
- `filter`
- `background-image`
- limited `background` shorthand

### Box Shadow

React Native now supports web-style `boxShadow` strings. Keep pass-through
string output after resolving vars/interpolation/calc/viewport units:

```css
box-shadow: 0 2px 8px rgba(0,0,0,.2), 0 1px 2px #333;
```

outputs:

```js
{ boxShadow: '0 2px 8px rgba(0,0,0,.2), 0 1px 2px #333' }
```

### Filter

React Native supports CSS-like filter strings. Pass through as string after
value resolution:

```css
filter: blur(4px) brightness(0.8);
```

outputs:

```js
{ filter: 'blur(4px) brightness(0.8)' }
```

### Background Image

React Native supports the style prop:

```js
experimental_backgroundImage
```

for web-like `linear-gradient()` and `radial-gradient()` strings.

CSS:

```css
background-image: linear-gradient(90deg, red, blue);
```

React Native output:

```js
{ experimental_backgroundImage: 'linear-gradient(90deg, red, blue)' }
```

Web output:

```js
{ backgroundImage: 'linear-gradient(90deg, red, blue)' }
```

Use generic kebab-to-camelCase for properties, then special-case
`backgroundImage` to `experimental_backgroundImage` for React Native target.

Supported background image functions:

- `linear-gradient()`
- `radial-gradient()`

Unsupported:

- `url(...)`
- image-set
- other image functions

Unsupported background images are dropped with `UNSUPPORTED_BACKGROUND_IMAGE`.

Multiple gradients must be preserved as a comma-separated string:

```css
background-image:
  linear-gradient(0deg, white, rgba(238, 64, 53, 0.8), rgba(238, 64, 53, 0) 70%),
  linear-gradient(45deg, white, rgba(243, 119, 54, 0.8), rgba(243, 119, 54, 0) 70%);
```

### Background Shorthand

Support a limited useful subset:

```css
background: red;
background: linear-gradient(90deg, red, blue);
background: red linear-gradient(90deg, red, blue);
background: linear-gradient(...), radial-gradient(...);
```

Output:

- color-only -> `backgroundColor`
- gradient-only -> `backgroundImage` / `experimental_backgroundImage`
- color + gradient -> both

Unsupported:

```css
background: url(foo.png);
background: no-repeat center/cover red;
background: fixed border-box red;
```

Do not implement full browser background shorthand.

## Runtime Store And React Tracking

Replace the dependency on:

- `teamplay`
- `teamplay/cache`
- `@nx-js/observer-util`

with a small CSSX-owned store and React integration.

### Variable Store

Preserve current public API:

```ts
variables['--text'] = '#111'
delete variables['--text']
Object.assign(variables, theme)
setDefaultVariables({ '--text': '#111' })
```

Implement `variables` as an internal `Proxy` over a plain object:

- detects `set`
- detects `deleteProperty`
- records changed variable names
- batches notifications in a microtask
- notifies only subscribers interested in changed names

Use microtask batching:

```ts
Object.assign(variables, {
  '--bg': 'black',
  '--text': 'white'
})
```

should notify once with `['--bg', '--text']`, not once per assignment.

Variables remain global singleton state initially. Provider-scoped variables are
out of scope.

### Runtime Options

Defaults must work without any setup.

Optional configuration paths:

```tsx
<CssxProvider value={{ dimensionsDebounceMs: 100 }}>
  <App />
</CssxProvider>
```

and:

```ts
configureCssx({ dimensionsDebounceMs: 100 })
```

Provider is for React tree options. Singleton config is for early app-wide setup.

### Tracked Sheet Wrapper

Manual runtime CSS should stay ergonomic:

```tsx
const sheet = useCompiledCss(generatedCss)

return (
  <>
    <Div {...cssx('root', sheet)} />
    <Span {...cssx('label', sheet)} />
  </>
)
```

`useCompiledCss()` returns a tracked wrapper, not the plain JSON IR. The wrapper:

- contains or references the compiled sheet
- holds a render-local dependency collector
- owns the React external-store subscription
- records dependencies from every `cssx()` call during render

`cssx()` itself:

- does not call hooks
- can be used inline in JSX spreads
- resolves style props
- records exact dependencies into the tracked wrapper if present

### React Subscription Lifecycle

Use `useSyncExternalStore` for external store subscriptions.

Important constraints:

- no global subscription mutation during render
- render-time dependency collection stays local to the tracked wrapper
- global subscriber registry is mutated only through hook subscribe/unsubscribe
  lifecycle
- aborted/suspended renders must not leak subscriptions

Algorithm target:

1. Hook creates a tracker/wrapper.
2. Before each render, tracker starts a new dependency collection.
3. Each inline `cssx()` call resolves styles and records used dependencies:
   - variable names and their versions
   - media query IDs/match state
   - viewport dimension dependency if used
4. After commit, an effect commits the collected dependency set.
5. `useSyncExternalStore` subscription listens only for changes intersecting the
   committed dependency set.
6. If a dependency changed between render and effect commit, trigger one
   corrective rerender.

Race safeguard:

- tracker records store version snapshot used during render
- commit effect compares against current versions
- if changed, force a rerender so no variable/media change is missed

Memory safety:

- suspended/aborted renders may collect dependencies locally, but never register
  them globally
- previous committed subscription remains active until React commits a new one or
  unmounts
- tests must cover promise-throwing Suspense renders where effects do not run

### Babel-Compiled Usage

Users still write:

```tsx
<View styleName="root" />
```

Babel hides the hook:

```tsx
function Button() {
  const __cssxSheet = useCssxSheet(__sheet)
  return <View {...cssx('root', __cssxSheet)} />
}
```

Babel should inject the hook only when a component's styles can depend on
runtime state:

- stylesheet uses `var()`
- stylesheet uses media queries
- stylesheet uses viewport units
- local template has interpolations
- dynamic interpolation could introduce `var(...)`

Static-only styles should not pay a subscription cost.

For any interpolation, always use the tracked runtime path, even if Babel sees a
literal expression. A string literal can still be `var(--x)`.

Dependency tracking must happen after selector matching and active media
filtering, so unused selectors do not cause rerenders:

```css
.root { color: var(--root-color); }
.label { color: var(--label-color); }
```

Resolving `styleName="root"` subscribes to `--root-color`, not `--label-color`.

If an interpolation value introduces a variable:

```tsx
css`
  .root { color: ${color}; }
`
```

and `color === 'var(--button-color)'`, the component subscribes to
`--button-color`. If later `color === 'red'`, it stops depending on that
variable after commit.

## Caching

The new engine owns caching directly. Teamplay cache is not needed.

### Static Sheet Result Cache

Static/imported/runtime-generated sheets can be shared by many elements and
style names. Use a bounded per-sheet result cache.

Target default:

```text
max 100 resolved entries per sheet
```

Make the exact size internal initially or configurable later.

Cache key includes only values that affect the resolved element:

- normalized `styleName`
- sheet ID/hash
- active layer IDs
- relevant CSS variable values discovered while resolving matched declarations
- relevant media query match state
- dimension values only if viewport units are used
- inline style props hash

Do not invalidate because an unrelated selector uses an unrelated variable.

### Interpolated Template Cache

Interpolated local templates must keep only one last-result slot:

```ts
{
  lastValues,
  lastResult
}
```

If values are the same by `Object.is` array equality, return the same result
reference. If values change, recompute and replace the previous slot. If values
later change back to an old value, recompute instead of keeping historical
variants.

### Raw String Convenience Cache

`cssx('root', generatedCss)` is allowed for convenience. It should internally
cache only the last raw CSS string and compiled sheet:

```ts
lastCssString
lastCompiledSheet
```

Users who need stronger caching should use:

```ts
const sheet = useCompiledCss(generatedCss)
```

or:

```ts
const sheet = useMemo(() => compileCss(generatedCss), [generatedCss])
```

### Inline Style Props Hash

Use value hashing by default for inline style props, matching current CSSX
ergonomics.

Current behavior uses:

```ts
simpleNumericHash(JSON.stringify(inlineStyleProps))
```

Continue this direction:

- use `JSON.stringify`
- numeric hash is fine
- do not require users to memoize inline style objects
- fresh-but-equal inline object literals should hit cache

If `JSON.stringify` throws on cycles, treat that inline input as uncacheable for
that render and warn in dev.

### Output Shape

Resolved style props should be flattened plain objects, like today:

Input:

```js
{ style: [{ color: 'red' }, { padding: 8 }] }
```

Output:

```js
{ style: { color: 'red', padding: 8 } }
```

This maximizes stable object identity.

## Part Props

Preserve `part="root"` behavior:

```tsx
<Component part="root" />
```

maps to the normal `style` prop.

Other parts map to:

```text
title -> titleStyle
icon -> iconStyle
hover -> hoverStyle
active -> activeStyle
```

The IR can represent:

- normal root styles as `part: null`
- part styles as `part: 'title'`
- pseudo aliases as `part: 'hover'` / `part: 'active'`

## Stylus

Stylus remains outside `@cssxjs/css-to-rn`.

Pipeline:

```text
Stylus source -> CSS string -> compileCss()
```

Runtime compilation is CSS-only:

```ts
compileCss(generatedCss)
```

Do not support:

```ts
compileStyl(generatedStylus)
```

This keeps `stylus` out of client bundles.

## Pug

Pug style blocks continue to be transformed into local `css` or `styl`
templates by the existing Pug/Babel path.

Supported:

```pug
style(lang='styl')
  .root
    color var(--color, red)
```

Not supported initially:

```pug
style(lang='styl')
  .root
    color ${color}
```

Pug interpolation syntax is a separate feature and is out of scope.

## Babel And Loader Integration

### Inline Template Plugin

Update `packages/babel-plugin-rn-stylename-inline`:

- stop rejecting all template expressions
- allow expressions only in function-scoped templates
- lower expressions to synthetic dynamic var tokens
- for CSS templates, compile tokenized CSS
- for Stylus templates, run tokenized Stylus through Stylus first, then compile
  CSS
- validate slot positions during compilation
- hoist static compiled sheet IR after imports
- inject local runtime hook when needed
- pass ordered expression array to `useCssxTemplate()`

Conceptual output:

```tsx
const __sheet = { /* compiled IR */ }

function Button({ color }) {
  const __CSS_LOCAL__ = useCssxTemplate(__sheet, [color])
  return <View styleName="root" />
}
```

The actual generated code may use different internal variable names, but should
preserve current user-facing behavior.

Global/module-level templates:

- remain static-only
- expressions are unsupported

### StyleName Plugin

Update `packages/babel-plugin-rn-stylename-to-style`:

- use new resolver/runtime imports
- support canonical IR layers
- preserve file < global < local < inline precedence
- continue converting `styleName` and `*StyleName`
- continue handling `part`
- hide injected hooks from users
- no longer require `observer()` or teamplay detection for caching

The existing `cache: 'teamplay'` option should become deprecated/no-op or be
removed in a breaking release path.

### External Imports

External `.cssx.css` and `.cssx.styl` imports should converge on canonical IR.

Migration can use `toLegacyStyleObject()` temporarily, but long term:

```tsx
import styles from './button.cssx.styl'

<View styleName="root" />
```

where `styles` is canonical compiled sheet IR.

Build-time compilers must use strict mode:

```ts
compileCss(css, { mode: 'build' })
```

### Loaders

Update `packages/loaders/cssToReactNativeLoader.js` to use
`@cssxjs/css-to-rn` instead of `@startupjs/css-to-react-native-transform`.

Update compiler wrappers in `packages/loaders/compilers/` to emit either:

- canonical IR, once runtime is migrated
- legacy object shape during the transition

### Umbrella Package

Update `packages/cssxjs`:

- re-export new APIs
- update runtime conditional exports to point to new platform runtime
- preserve public import paths where possible

## Legacy Adapter

Include a legacy object-shape adapter for incremental migration:

```ts
toLegacyStyleObject(sheet)
```

Output shape:

```js
{
  root: { paddingTop: 8 },
  'root::part(label)': { color: 'red' },
  __hash__: 123,
  __vars: ['--color'],
  __hasMedia: true
}
```

Use this only as a bridge. The canonical rule/declaration IR is the target.

## Tests

Use the same broad test setup pattern as `../teamplay/packages/teamplay`:

- Mocha for source-level engine/isomorphic tests
- Jest + jsdom for React tests
- Node `-C cssx-ts` custom condition for direct TS source tests
- TypeScript type tests/build tests

React integration tests should target React 19 only. Upgrade dev/test deps on
this branch as needed.

### Test Scripts

Approximate package scripts:

```json
{
  "test": "npm run test-engine && npm run test-react && npm run test-types",
  "test-engine": "NODE_OPTIONS=\"${NODE_OPTIONS:-} -C cssx-ts\" mocha 'test/[!_]*.test.ts'",
  "test-react": "NODE_OPTIONS=\"${NODE_OPTIONS:-} --experimental-vm-modules -C cssx-ts\" jest --runInBand",
  "test-types": "tsc -p tsconfig.json --noEmit",
  "build": "tsc -p tsconfig.build.json"
}
```

Exact paths can follow the package layout.

### Pure Engine Tests

Port and expand tests from:

- `../css-to-react-native/src/__tests__`
- `../css-to-react-native-transform/src/index.spec.js`
- `packages/runtime/test/process.mjs`
- `packages/runtime/test/matcher.mjs`

Cover:

- property name normalization
- raw value transforms
- unit conversion
- shorthand expansion
- border shorthand including dynamic width/color/style after var resolution
- margin/padding/radius/width/color/style shorthands
- transform
- text-shadow
- box-shadow string pass-through
- filter string pass-through
- background-image platform mapping
- background shorthand limited support
- unsupported background images
- animations
- transitions
- comma-separated animation/transition values
- keyframes
- keyframes with vars
- keyframes with interpolation slots
- media query parsing and validation
- viewport units
- limited calc
- `u` unit
- CSS variables:
  - runtime value
  - default value
  - inline fallback
  - nested fallback
  - unresolved
  - cycles
  - depth limit
  - variable inside whole shorthand
  - variable inside shorthand part
  - variable inside comma chunk
  - variable inside complex functions
- interpolation:
  - CSS templates
  - Stylus templates
  - primitive values
  - `null` / `undefined` / `false`
  - invalid `true`
  - invalid objects/arrays/functions/symbols/bigint
  - interpolated `var(...)`
  - unsupported selector/property/media/export positions
- selectors:
  - class
  - multi-class
  - `:part()`
  - `::part()`
  - `:hover`
  - `:active`
  - unsupported descendants/IDs/attrs/pseudos
- cascade:
  - specificity
  - source order
  - declaration fallback when dynamic declaration invalid
  - file/global/local/inline precedence
- diagnostics:
  - stable codes
  - line/column
  - empty sheet on runtime syntax error
  - strict throw in build mode
  - warning dedupe
- legacy adapter output

### Cache Tests

Add focused reference-stability tests:

- same static `styleName` returns same result object
- fresh-but-equal inline object returns same result object due to JSON hash
- changed inline object invalidates
- unrelated variable change does not invalidate or rerender
- used variable change invalidates
- inactive media variable does not subscribe or invalidate
- media query match changes invalidate
- viewport unit dimension changes invalidate
- static sheet bounded cache evicts predictably
- interpolated sheet stores only one previous value set
- interpolation same primitive values returns same references
- interpolation changed values replace previous cache slot
- interpolation changed back recomputes rather than using historical cache
- raw CSS string convenience caches only one compiled string

### React Integration Tests

Use Jest/jsdom and React 19.

Cover:

- `useCompiledCss()` returns tracked wrapper
- inline `<Div {...cssx('root', sheet)} />` records dependencies
- multiple `cssx()` calls in one component union dependencies
- components rerender only for used variables
- components do not rerender for unused variables
- interpolation values that introduce `var()` dynamically update subscriptions
- interpolation values that stop using `var()` remove subscriptions after commit
- microtask batching of `variables` changes
- dimension leading/trailing debounce
- web `matchMedia` query subscriptions
- viewport unit resize subscriptions
- SSR/no-window fallback behavior
- unmount cleanup
- Suspense-aborted render does not leak subscriptions
- promise thrown during rerender where effect does not run destructor does not
  leak new subscriptions
- stale-check rerenders if variable changes between render and effect commit
- subscriber counts are observable in tests through internal test-only helpers

### Babel Tests

Update snapshot tests for:

- static inline templates
- interpolated local CSS templates
- interpolated local Stylus templates
- rejection of global template interpolation
- rejection of unsupported interpolation positions
- `styleName` transform with injected hook only when needed
- static template with no hook
- external imports with canonical IR or legacy bridge
- `:hover` / `:active` output
- `part="root"` behavior
- Pug style blocks still lowering to CSS/Stylus templates

## Migration Milestones

### Milestone 1: Package Scaffold And Test Harness

- Create `packages/css-to-rn`.
- Add TS package config, build config, source condition, exports.
- Add Mocha source tests and Jest React test setup mirroring Teamplay.
- Add initial type declarations through TS source.
- Add copied/adapted test fixtures from forks and current runtime.
- Do not change existing production runtime yet.

Exit criteria:

- package tests run against TS source
- package builds `.js` and `.d.ts`
- test scaffold includes expected failing tests for new behavior

### Milestone 2: Pure Compiler IR

- Implement lightweight CSS parse path.
- Implement selector parser/validator.
- Implement rule/declaration/keyframe IR.
- Implement metadata and diagnostics.
- Implement build/runtime modes.
- Implement path-private hashes.
- Implement `:export` static-only.
- Implement unsupported selector diagnostics.
- Implement legacy adapter enough to compare with current output.

Exit criteria:

- static CSS fixtures compile to expected IR
- diagnostics work in runtime-safe and build-strict modes
- legacy adapter matches current static behavior for core cases

### Milestone 3: Value Resolver And Property Transformer

- Implement interpolation slot representation.
- Implement recursive `var()` resolver with cycles/depth.
- Implement declaration invalidation.
- Implement limited `calc()`.
- Implement viewport and `u` unit handling.
- Implement or adapt property transforms.
- Add new properties:
  - `filter`
  - `background-image`
  - limited `background`
- Implement animations/transitions/keyframes.

Exit criteria:

- forked property tests pass or have intentional documented deltas
- complex var/shorthand tests pass
- Reanimated v4 animation style output matches docs

### Milestone 4: Pure Resolver And Caching

- Implement `resolveCssx()` over sheet layers.
- Implement specificity/source-order cascade.
- Implement media filtering.
- Implement dependency reporting from resolution.
- Implement per-sheet bounded cache.
- Implement single-entry interpolation cache.
- Implement inline style JSON hash.
- Implement raw string single-entry compile cache.
- Implement flattened output props.

Exit criteria:

- cache reference tests pass
- dependency-specific invalidation tests pass
- current matcher/process behavior is covered by new tests

### Milestone 5: React Runtime Integration

- Implement variable store proxy.
- Implement default variables.
- Implement microtask batching.
- Implement platform dimension adapters.
- Implement web `matchMedia` support.
- Implement React tracked sheet wrapper.
- Implement `useCompiledCss()`, `useCssxSheet()`, `useCssxTemplate()`.
- Implement `CssxProvider` and `configureCssx()`.
- Implement Suspense-safe subscription lifecycle.

Exit criteria:

- React tests pass
- no `observer()` needed
- no `teamplay` needed
- no `@nx-js/observer-util` needed

### Milestone 6: Babel And Loader Migration

- Update inline template plugin for interpolation lowering.
- Update styleName plugin for new resolver/hook path.
- Update loaders to call `@cssxjs/css-to-rn`.
- Keep legacy adapter bridge if needed.
- Update package dependencies.
- Update `cssxjs` public exports and conditional runtime exports.

Exit criteria:

- existing Babel snapshots updated
- example app works
- CSS variables/media no longer need `observer()`
- static style behavior remains compatible

### Milestone 7: Runtime Package Cleanup

- Remove duplicated logic from `packages/runtime`.
- Either:
  - turn it into a compatibility wrapper around the new package, or
  - remove it from internal generated imports and keep only if publishing
    compatibility requires it
- Remove `teamplay` cache integration.
- Remove `@nx-js/observer-util` dependency.
- Update docs that currently mention teamplay caching.

Exit criteria:

- public `cssxjs` API works without teamplay
- docs no longer require `observer()`
- package dependency graph no longer includes removed runtime deps unless another
  package still genuinely needs them

### Milestone 8: Docs And Examples

Update docs for:

- interpolation
- runtime `compileCss()`
- `cssx()` and `useCompiledCss()`
- diagnostics for AI-generated CSS
- no-observer variable/media rerendering
- caching behavior
- `:hover` / `:active` part aliases
- `filter`
- `background-image`
- Reanimated v4 animation expectations

Update examples to demonstrate:

- local interpolation
- AI-generated CSS runtime use
- variables without `observer()`
- media query updates without teamplay

## Implementation Notes

### Avoiding The Old Split

Do not recreate the old three-package architecture inside one package. Use the
old packages as:

- test sources
- known-good code snippets
- behavior references

Build the new architecture around:

- canonical IR
- value-layer dynamic resolution
- dependency-aware resolver
- direct cache ownership
- React tracked wrapper integration

### Build-Time Versus Runtime Behavior

The same compiler powers both:

- Babel/loaders
- runtime AI-generated CSS

But options differ:

```ts
compileCss(css, { mode: 'build' })   // strict, throw
compileCss(css, { mode: 'runtime' }) // default, graceful diagnostics
```

### React 19

Only support React 19 going forward for the new runtime integration. Use
`useSyncExternalStore` for external subscriptions. `use(context)` may be useful
for reading provider options, but it does not replace external store
subscription.

### Platform Targets

The engine should understand target platform:

```ts
platform: 'ios' | 'android' | 'web'
reactType: 'react-native' | 'web'
```

This matters for:

- `experimental_backgroundImage` vs `backgroundImage`
- pure web line-height string handling
- platform-specific future behavior

### Current Public Behavior To Preserve

- `styleName` accepts string, arrays, and object flags.
- `styleName` class matching supports multi-class selectors.
- `part` prop injects part style props into component props.
- `part="root"` maps to `style`.
- file/global/local/inline precedence stays the same.
- static styles continue to be build-time compiled.
- Stylus global imports/preprocessing stay outside pure CSS engine.

## Open Implementation Choices

These are left to implementation judgment:

- exact internal names for hooks and generated variables
- exact cache size defaults
- exact hash function, as long as deterministic and small
- exact parser abstraction around `css/lib/parse`
- exact diagnostic message wording
- whether legacy adapter is used only in tests or also during migration

Do not reopen the high-level decisions in this document unless implementation
reveals a concrete blocker.
