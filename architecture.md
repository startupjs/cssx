# CSSX Architecture

CSSX is a CSS-in-JS system for React Native, react-native-web, and pure React web targets. Users write `css`, `styl`, and optional `pug` templates, apply styles with `styleName`, expose child component override points with `part`, and update CSS variables at runtime.

The current architecture centers on `@cssxjs/css-to-rn`. That package owns the unified CSS-to-style pipeline: CSS parsing, canonical sheet IR, selector matching, CSS variable/interpolation resolution, React Native/web property transformation, runtime caching, dimensions/media tracking, and React subscription helpers. The older separate runtime package has been removed from the active dependency graph.

## Repository Map

- `docs/`: public documentation served by Rspress.
- `packages/css-to-rn/`: unified compiler and runtime engine.
- `packages/cssxjs/`: umbrella package published as `cssxjs`; exports public APIs, runtime compatibility wrappers, Babel/Metro wrappers, CLI, and loader wrappers.
- `packages/loaders/`: webpack-compatible loaders plus compiler helpers used by Babel and Metro. Stylus still compiles to CSS here; CSS compilation delegates to `@cssxjs/css-to-rn`.
- `packages/babel-plugin-rn-stylename-inline/`: compiles inline `css` and `styl` tagged templates.
- `packages/babel-plugin-rn-stylename-to-style/`: rewrites JSX `styleName`, `part`, old `*StyleName`, and helper calls into runtime calls.
- `packages/babel-preset-cssxjs/`: composes syntax plugins, React Pug, inline style compilation, and `styleName`/`part` rewriting.
- `packages/bundler/`: Metro config and transformer support for separate `.cssx.styl` and `.cssx.css` files.
- `packages/eslint-plugin-cssxjs/`: facade over `@react-pug/eslint-plugin-react-pug`.
- `example/`: simple web example using Babel plus esbuild directly.

The repository uses Yarn workspaces and Lerna. Root `package.json` requires Node `>=22`.

## Public API Surface

The `cssxjs` package exposes:

- `css` and `styl`: Babel-processed template tags, plus helper-call forms after Babel rewriting.
- `pug`: template tag processed by `@react-pug/babel-plugin-react-pug`.
- `cssx`: runtime helper from `@cssxjs/css-to-rn/react`.
- `variables`, `defaultVariables`, `setDefaultVariables`: runtime CSS variable registries.
- `useRuntimeCss`, `useCssxSheet`, `useCssxTemplate`: React helpers for runtime-generated CSS and local template values.
- `CssxProvider`, `configureCssx`, `useCssxConfig`: optional runtime configuration.
- `cssxjs/runtime`, `cssxjs/runtime/web`, `cssxjs/runtime/react-native`, and `teamplay` compatibility runtime paths used by Babel-generated code.
- `cssxjs/babel`, `cssxjs/metro-config`, and `cssxjs/metro-babel-transformer`.
- `cssxjs check`: CLI bridge to `@react-pug/check-types`.

`packages/cssxjs/index.js` intentionally makes direct unprocessed `css`, `styl`, and `pug` calls throw. Seeing those errors means the file did not go through the Babel pipeline.

## End-To-End Flow

### Authoring

Users write components like:

```jsx
import { styl } from 'cssxjs'
import { View, Text } from 'react-native'

function Button ({ variant, children }) {
  return (
    <View part='root' styleName={['root', variant]}>
      <Text part='text' styleName='text'>{children}</Text>
    </View>
  )

  styl`
    .root
      padding 2u
      background var(--button-bg, #1677ff)
    .text
      color white
  `
}
```

Parent components can target exposed parts from outside:

```jsx
function Toolbar () {
  return <Button styleName='primaryButton'>Save</Button>

  styl`
    .primaryButton
      background #0057d9
      &:part(text)
        font-weight bold
  `
}
```

Parts are only addressable from outside the component exposing them. Inside a component, style the inner element directly with its own class selector.

### Babel Preset

`packages/babel-preset-cssxjs/index.js` configures transforms in this order:

1. JSX/TypeScript syntax plugins.
2. `@react-pug/babel-plugin-react-pug` when `transformPug !== false`.
3. `@cssxjs/babel-plugin-rn-stylename-inline` when `transformCss !== false`.
4. `@cssxjs/babel-plugin-rn-stylename-to-style` when `transformCss !== false`.

This order matters. Pug must become JSX before CSSX rewrites JSX attributes, and inline CSS/Stylus templates must compile before `styleName` references are converted into runtime calls.

Important options:

- `platform`: passed to style compilers. Defaults to `web` or Babel caller platform.
- `reactType`: chooses runtime target, `web` or `react-native`.
- `cache`: accepts `teamplay` for compatibility. It still affects generated import paths, but runtime caching is now internal to `@cssxjs/css-to-rn`.
- `transformPug` and `transformCss`: disable the corresponding transforms when false.

### Inline Template Compilation

`packages/babel-plugin-rn-stylename-inline/index.js` handles `css` and `styl` tagged templates imported from magic imports. Defaults are `cssxjs` and `startupjs`.

Behavior:

- Imported aliases are supported.
- Module-level templates become `const __CSS_GLOBAL__ = compiledSheet`.
- Function-level templates become a top-level compiled sheet plus function-local `const __CSS_LOCAL__ = compiledSheet`.
- Local JS template interpolation is supported. Expressions are lowered to synthetic declaration-value variables:

```jsx
css`
  .root {
    color: ${color};
    padding: ${pad} 2u;
  }
`
```

compiles as a sheet containing `var(--__cssx_dynamic_0)` and `var(--__cssx_dynamic_1)`, while the function receives:

```js
const __CSS_LOCAL__ = {
  sheet: _localCssInstance,
  values: [color, pad]
}
```

Interpolations are allowed only in function-scoped local `css`/`styl` templates and only in declaration values. Selectors, property names, media queries, exports, and module-level templates remain static.

### JSX Rewriting

`packages/babel-plugin-rn-stylename-to-style/index.js` handles JSX styling attributes and helper calls.

A JSX opening element with `styleName`, `style`, or part style props becomes a spread call:

```jsx
<View styleName='root' style={style} />
```

conceptually becomes:

```jsx
<View
  {..._cssx(
    'root',
    fileStyles,
    typeof __CSS_GLOBAL__ !== 'undefined' && __CSS_GLOBAL__,
    typeof __CSS_LOCAL__ !== 'undefined' && __CSS_LOCAL__,
    { style }
  )}
/>
```

The runtime call returns an object containing `style` and any `{part}Style`, `hoverStyle`, or `activeStyle` props.

The same runtime call shape is used for public helper forms like:

```jsx
<Card {...styl(['card', variant], { titleStyle })} />
```

Runtime import paths are selected by plugin options:

- default: `cssxjs/runtime`
- `reactType: 'web'`: `cssxjs/runtime/web`
- `reactType: 'react-native'`: `cssxjs/runtime/react-native`
- `cache: 'teamplay'`: `cssxjs/runtime/teamplay`
- both `reactType` and `cache`: `cssxjs/runtime/web-teamplay` or `cssxjs/runtime/react-native-teamplay`

The `teamplay` paths are compatibility wrappers around the same new runtime.

## `@cssxjs/css-to-rn`

This package is TypeScript-first ESM and uses Node's strip-only TS support for tests via the custom export condition `cssx-ts`.

### Exports

- Root `@cssxjs/css-to-rn`: isomorphic compiler/resolver APIs.
- `@cssxjs/css-to-rn/react`: React runtime helpers with conditional web/native behavior.
- `@cssxjs/css-to-rn/web`: web-targeted helpers.
- `@cssxjs/css-to-rn/react-native`: React Native-targeted helpers.

`react` and `react-native` are optional peer dependencies.

### Canonical Sheet IR

`compileCss()` and `compileCssTemplate()` return JSON-serializable sheets:

```ts
interface CompiledCssSheet {
  version: 1
  id: string
  sourceId?: string
  contentHash: string
  rules: CssxRule[]
  keyframes: Record<string, CssxKeyframe[]>
  exports?: Record<string, string>
  metadata: CssxMetadata
  diagnostics: CssxDiagnostic[]
  error?: CssxDiagnostic
}
```

Rules preserve:

- selector text.
- class list.
- logical part target, or `null` for root.
- class-count specificity.
- source order.
- optional media condition.
- declaration order and source locations.

The sheet must remain serializable. Cache state, subscriptions, and runtime trackers live outside the sheet.

### Compiler

`src/compiler.ts` parses CSS with the lightweight `css` parser. Runtime mode returns an empty diagnostic sheet on syntax errors. Build mode throws for errors that should fail Babel/loader builds.

Build mode validates static declaration values through the shared value resolver
and property transformer. Unsupported static constructs such as
layout-dependent `calc()` expressions, unsupported transform functions, and
unsupported background images fail during Babel/loader compilation.
Declarations containing `var()` or template slots are deferred to runtime
validation because their final value is not knowable at build time.

Supported selectors:

- `.root`
- `.root.active`
- `.root:part(label)`
- `.root::part(label)`
- `.root.active:part(icon)`
- `.root:hover`
- `.root:active`
- `Button`
- `Button.primary`
- `Button:part(text)`
- `Button::part(text)`
- `Button.primary:part(text)`
- `:export`
- bare `:root` custom-property declarations

`:hover` maps to `hoverStyle`; `:active` maps to `activeStyle`. Tag selectors apply only when the current component tag is provided by `themed(tagName, Component)` or explicit resolver options. Unsupported selectors are ignored with diagnostics in runtime mode.

Bare `:root` custom-property declarations are compiled into `sheet.rootVariables` and become scoped defaults when the sheet is supplied through `CssxProvider style` or another layer. Declaration-level custom properties outside `:root` are ignored with diagnostics.

### Value Resolution

`src/values.ts` resolves declaration value strings before property transformation:

1. Replace interpolation slots from `values`.
2. Recursively resolve nested `var()`.
3. Resolve `u`, viewport units, and supported `calc()`.
4. Normalize supported modern color functions (`oklch()`, `oklab()`, `color-mix()`) to `rgba(...)`.
5. Return dependencies for variables and dimensions.

Variable priority is:

1. template interpolation values.
2. runtime `variables['--name']`.
3. nearest scoped provider/sheet `:root` variable.
4. outer scoped provider/sheet `:root` variables.
5. `defaultVariables['--name']`.
6. inline fallback `var(--name, fallback)`.

Unresolved variables, cycles, depth limits, invalid interpolations, and unsupported `calc()` invalidate only the containing declaration. Earlier fallback declarations in the same rule still apply.

`1u = 8px`. Viewport units resolve from current dimensions. `calc()` supports arithmetic that can reduce to a concrete numeric or pixel value; layout-dependent percentages are unsupported.

### Property Transformation

`src/transform/index.ts` turns final CSS declaration values into React Native/web style props. It supports:

- raw camelCase property pass-through.
- margin/padding/border/border-radius/border-width/border-color shorthands.
- transform arrays.
- text-shadow.
- box-shadow string pass-through.
- `filter` string pass-through.
- animation and transition shorthands/longhands.
- keyframe object inlining for Reanimated v4 style props.
- `background-image` and limited `background` shorthand.

For React Native, `background-image` becomes `experimental_backgroundImage`. Only `linear-gradient()` and `radial-gradient()` are emitted; image URLs and other image functions are diagnosed and dropped.

### Resolver And Caching

`src/resolve.ts` composes the compiler, value resolver, property transformer, cascade, and caching.

Public functions:

- `resolveCssx(options)`
- `cssx(styleName, layers, inlineStyleProps?, options?)`
- `createCssxCache()`

Resolver order:

1. Normalize `styleName` with classcat-like semantics.
2. Normalize one or more sheet layers.
3. Match selectors by component tag and class set.
4. Filter inactive media rules.
5. Group by output prop: `style`, `{part}Style`, `hoverStyle`, `activeStyle`.
6. Apply cascade by layer, specificity, and source order.
7. Resolve dynamic values declaration-by-declaration.
8. Transform final declarations.
9. Inline only keyframes referenced by active animation declarations.
10. Merge inline style props last.

Runtime caches are bounded. Static cache keys include sheet identity, style names, and a JSON/hash of inline style props. Dynamic signatures include only used variables, used media matches, and dimensions when actually used. Interpolated local templates keep one effective cache entry per tracked sheet call shape; changing values replaces the same cache slot instead of growing historical variants.

`JSON.stringify()` is intentionally used for inline style value hashing. Cyclic inline style objects are treated as uncacheable.

### React Runtime

`src/react/**` adds React integration without making `cssx()` a hook.

Key pieces:

- `store.ts`: `variables`, `defaultVariables`, `setDefaultVariables()`, variable bulk methods, dimensions/media state, microtask-batched notifications.
- `tracker.ts`: `TrackedCssxSheet`, committed dependency snapshots, per-tracker cache.
- `cssx.ts`: ergonomic `cssx()` wrapper that delegates to `resolveCssx()` and records dependencies into tracked sheets during render.
- `hooks.ts`: `useCssxSheet()`, `useRuntimeCss()`, `useCssxTemplate()`, `useCssxLayer()`, `useCssVariable()`, `useCssVariableRaw()`, `getCssVariable()`, and `getCssVariableRaw()`.
- `config.ts`: optional `CssxProvider`, `configureCssx()`, `useCssxConfig()`, and `themed()`.

`useCssxSheet()` starts a render-local dependency collection before render and commits it in a layout/effect phase. If a render is aborted, for example because a component throws a promise into Suspense, the pending dependencies are not committed and do not leak global subscriptions.

`CssxProvider style` accepts raw CSS strings, compiled sheets, tracked sheets, layer objects, arrays, and falsey values. Provider layers are appended after parent provider layers and before component-local layers. Nested providers append additional `:root` variable scopes, with inner scopes winning over outer scopes. `themed()` adds the current component tag and a render-local dependency tracker so provider/global styles that read variables can update themed components even when they have no local sheet.

Variable writes and deletes notify subscribers once per microtask. Subscribers only rerender when a variable they actually used changes. Viewport-unit subscribers are tied to dimension changes. Media-query dependencies store the match value observed during the committed render; dimension changes and platform media adapter changes only rerender subscribers whose committed media result changed. Browser `matchMedia` is used on web when available, and tests can install a media-query adapter for non-DOM media features such as `prefers-color-scheme`, `hover`, and `pointer`. Web resize uses leading plus trailing debounced updates.

## Loaders And Separate Files

Stylus remains separate from CSS-to-RN transformation:

1. `stylusToCssLoader` compiles Stylus to CSS and preserves current project/UI auto-import behavior.
2. `cssToReactNativeLoader` calls `compileCss()` or `compileCssTemplate()` from `@cssxjs/css-to-rn`.
3. The loader emits `module.exports = <compiledSheetJson>`.

`cssToReactNativeLoader` still handles `:export` compatibility by exposing exports as top-level properties on the emitted object. It also adds `__hash__` for old generated-code compatibility, but the new runtime uses sheet IDs and its own cache.

The loader is CommonJS because Babel and webpack loader APIs are synchronous CommonJS. In normal Node >=22 usage it can require the ESM package directly. Jest's CommonJS runtime cannot, so plugin tests use the Teamplay-style TS/Jest setup and a test-only child-process fallback when Jest intercepts ESM loading.

Metro separate-file support lives in `packages/bundler`. Inline templates do not need Metro loader setup.

## Component Parts

Parts are a compile-time/runtime protocol.

On the parent side:

```stylus
.card:part(title)
  color red
```

resolves under `titleStyle` when the parent element has `styleName='card'`.

On the child side:

```jsx
function Card ({ title }) {
  return <Text part='title'>{title}</Text>
}
```

is rewritten so the closest likely React component accepts `titleStyle` and appends it to that element's `style` prop. If props are destructured, the Babel plugin injects missing part style variables into the destructuring pattern. If no props parameter exists, it creates one.

`part='root'` maps to the normal `style` prop.

Part names must be statically knowable. Supported `part` values are:

- string literals, including space-separated parts.
- arrays of string literals and object expressions.
- object expressions with static keys and dynamic truthy/falsy values.

Unsupported dynamic part names throw at build time.

## Pug, Type Checking, And Linting

CSSX does not implement the Pug parser itself. It wraps React Pug tooling:

- Babel transform: `@react-pug/babel-plugin-react-pug`.
- type checker: `@react-pug/check-types`.
- ESLint processor: `@react-pug/eslint-plugin-react-pug`.

`packages/cssxjs/cli.js` implements:

```sh
npx cssxjs check [files...] [--project <tsconfig-path>]
```

and delegates to `packages/cssxjs/check.js`, which re-exports `@react-pug/check-types`.

## Testing

Run everything:

```sh
yarn test
```

Useful targeted tests:

```sh
cd packages/css-to-rn && npm test
cd packages/babel-plugin-rn-stylename-inline && yarn test
cd packages/babel-plugin-rn-stylename-to-style && yarn test
```

`@cssxjs/css-to-rn` tests:

- `test/engine/**`: parser IR, value resolution, property transforms, resolver cascade, cache behavior.
- `test/react/**`: variable batching, dependency tracking, media adapter invalidation, aborted-render safety, tracked cache references, React 19 hook/Suspense behavior.

Babel plugin tests use `babel-plugin-tester` and Jest snapshots in:

- `packages/babel-plugin-rn-stylename-inline/__tests__/`
- `packages/babel-plugin-rn-stylename-to-style/__tests__/`

The inline plugin test package uses a small TypeScript Jest transformer modeled after Teamplay because Jest cannot otherwise load TS/ESM workspace sources through custom export conditions.

## Maintenance Constraints

- Keep `__CSS_GLOBAL__`, `__CSS_LOCAL__`, and the Babel runtime call shape compatible unless both Babel plugins and runtime wrappers change together.
- Keep compiled sheet IR JSON-serializable.
- Keep `@cssxjs/css-to-rn` as the single owner of selector matching, value resolution, property transformation, caching, variables, and dimension/media dependency tracking.
- Do not reintroduce Teamplay or `@nx-js/observer-util` as runtime cache/subscription requirements.
- Keep Stylus-to-CSS separate from CSS-to-style transformation.
- For selector or cascade changes, update resolver tests and Babel snapshots as needed.
- For value syntax changes, update value resolver and transform tests together.
- For interpolation changes, update inline Babel snapshots and resolver cache tests.
- For part injection changes, update tests for destructured props, named props, nested render functions, `root`, and dynamic parts.
- For public API changes, update `docs/`, `AGENTS.md`, and this file.
- Be careful with historical READMEs and changelogs. Prefer current code, current docs, and this architecture document when they conflict.
