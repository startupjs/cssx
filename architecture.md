# CSSX Architecture

CSSX is a CSS-in-JS system for React Native, react-native-web, and pure React web targets. Its public API lets users write `styl`, `css`, and optional `pug` tagged template literals, apply styles with `styleName`, expose child component override points with `part`, and update CSS variables at runtime.

Most work happens at build time. Babel compiles template literals and `.cssx.*` imports into plain style objects, then rewrites JSX so elements receive a spread of runtime-generated style props. The runtime is deliberately small: it matches class names to compiled selectors, applies CSS variables and media queries, handles `:part()` style props, and optionally memoizes results with teamplay.

## Repository Map

- `docs/`: public documentation served by Rspress. Start here for expected user-facing behavior.
- `packages/cssxjs/`: umbrella package published as `cssxjs`. It exposes the public entrypoints, CLI, runtime wrappers, Babel preset wrapper, loader wrappers, and Metro wrappers.
- `packages/runtime/`: style matching, CSS variable state, media-query dimension state, platform helper injection, and cached/non-cached runtime entrypoints.
- `packages/loaders/`: webpack-compatible style loaders plus direct compiler helpers used by Babel.
- `packages/babel-plugin-rn-stylename-inline/`: compiles inline `css` and `styl` template literals into module/function-scoped style objects.
- `packages/babel-plugin-rn-stylename-to-style/`: rewrites `styleName`, `part`, `*StyleName`, and `styl(...)`/`css(...)` function calls into runtime calls.
- `packages/babel-preset-cssxjs/`: composes syntax plugins, React Pug transform, inline style compilation, and `styleName`/`part` transform.
- `packages/bundler/`: Metro config and transformer support for separate `.cssx.styl` and `.cssx.css` files.
- `packages/eslint-plugin-cssxjs/`: facade over `@react-pug/eslint-plugin-react-pug`.
- `example/`: simple web example using Babel plus esbuild directly.
- `docs-theme/` and `rspress.config.ts`: documentation theme and syntax highlighting configuration.

The repository uses Yarn workspaces and Lerna. Root `package.json` requires Node `>=22` and defines the main scripts.

## Public API Surface

The published `cssxjs` package exposes:

- `styl` and `css`: template tags processed away by Babel, and function forms used as `styl(styleName, inlineStyleProps)` / `css(...)` after Babel rewrites them.
- `pug`: template tag processed by `@react-pug/babel-plugin-react-pug`.
- `variables`: observable runtime CSS variable overrides.
- `setDefaultVariables` and `defaultVariables`: default CSS variable registry.
- `dimensions`: observable screen width state for media-query invalidation.
- `matcher`: advanced/internal class selector matcher.
- `cssxjs/babel`: Babel preset wrapper.
- `cssxjs/metro-config` and `cssxjs/metro-babel-transformer`: Metro integration wrappers.
- `cssxjs check`: CLI bridge to `@react-pug/check-types`.

`packages/cssxjs/index.js` intentionally makes `css`, `styl`, and `pug` throw at runtime. If a user sees those errors, their file did not go through the Babel pipeline.

## End-to-End Build Flow

### 1. Authoring

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

Parent components can target the exposed parts from outside:

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

The core authoring constructs are:

- class-like `styleName` values: strings, arrays, and object flags.
- `part` attributes with compile-time-static names.
- `:part(name)` selectors in CSS/Stylus, used by parent/outside styles to target child component parts.
- runtime CSS variables through `var(--name, fallback)`.
- media queries and viewport units.
- optional Pug templates and embedded terminal `style` blocks.

### 2. Babel Preset

`packages/babel-preset-cssxjs/index.js` configures the transform stack:

1. Syntax support for JSX, TypeScript, and TSX depending on filename.
2. `@react-pug/babel-plugin-react-pug` when `transformPug !== false`.
3. `@cssxjs/babel-plugin-rn-stylename-inline` when `transformCss !== false`.
4. `@cssxjs/babel-plugin-rn-stylename-to-style` when `transformCss !== false`.

This order matters. Pug must become JSX before CSSX rewrites JSX attributes. Inline CSS/Stylus templates must compile before `styleName` references are converted into runtime calls.

Preset options:

- `platform`: passed to style compilers. Defaults to `web` or Babel caller platform.
- `reactType`: chooses runtime target, currently `web` or `react-native`.
- `cache`: chooses cached runtime, currently only `teamplay`.
- `transformPug`: disables Pug transformation when false.
- `transformCss`: disables CSS/Stylus and `styleName` transformation when false.

### 3. Pug Transform

Pug support is provided by external `@react-pug/*` packages. CSSX wraps those packages through:

- `cssxjs/babel/plugin-react-pug`
- `cssxjs check`
- `eslint-plugin-cssxjs`

Current CSSX docs recommend terminal embedded style blocks inside Pug templates:

```jsx
return pug`
  View.card
    Text.title= title

  style(lang='styl')
    .card
      padding 2u
`
```

The React Pug Babel plugin turns this into JSX plus local `styl` or `css` templates, which are then handled by CSSX's inline style plugin.

### 4. Inline Style Compilation

`packages/babel-plugin-rn-stylename-inline/index.js` processes `css` and `styl` tagged template literals imported from magic imports. The default magic imports are `cssxjs` and `startupjs`.

Important behavior:

- Only imported `css`/`styl` identifiers are processed. Aliases are supported.
- Template interpolation is rejected. Dynamic values should use CSS variables or inline `style`.
- Module-level templates become a top-level `const __CSS_GLOBAL__ = ...`.
- Function-level templates become a top-level compiled object plus a function-local `const __CSS_LOCAL__ = ...`.
- The plugin removes processed template expressions.
- Compilation is delegated to `@cssxjs/loaders/compilers`.

The generated names come from `packages/runtime/constants.cjs`:

- `GLOBAL_NAME`: `__CSS_GLOBAL__`
- `LOCAL_NAME`: `__CSS_LOCAL__`

Those names are part of the transform/runtime contract.

### 5. Style File Imports and JSX Rewriting

`packages/babel-plugin-rn-stylename-to-style/index.js` is the main JSX transform. It has three jobs.

First, it handles style file imports. Default extensions are `cssx.css` and `cssx.styl`, so imports such as `import './Button.cssx.styl'` are style imports. In tests the plugin is often configured with `extensions: ['styl', 'css']`.

When `compileCssImports` is true, Babel reads and compiles the file itself and replaces the import with a compiled `const`. This is convenient but means changes to the separate style file may require restarting or clearing Babel cache. When false, the import stays in place and the bundler must compile it.

Second, it rewrites JSX styling attributes. A JSX opening element with `styleName`, `style`, or part style props becomes a spread call:

```jsx
<View styleName='root' style={style} />
```

becomes conceptually:

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

The runtime call returns an object containing `style` and any `{part}Style` props.

Third, it rewrites function calls to imported `styl`/`css` identifiers. This supports the public spread helper form:

```jsx
<Card {...styl(['card', variant], { titleStyle })} />
```

The helper call is replaced with the same runtime call shape used for JSX attributes.

Runtime import paths are chosen from plugin options and imports:

- default: `cssxjs/runtime`
- `reactType: 'web'`: `cssxjs/runtime/web`
- `reactType: 'react-native'`: `cssxjs/runtime/react-native`
- `cache: 'teamplay'`: `cssxjs/runtime/teamplay`
- both `reactType` and `cache`: `cssxjs/runtime/web-teamplay` or `cssxjs/runtime/react-native-teamplay`

If the file imports an `observer` named import from `teamplay` or `startupjs`, the plugin auto-selects `cache: 'teamplay'`.

## Style Compilation

### Loader Chain

The style compiler path is:

1. Stylus input goes through `stylusToCssLoader` to become CSS.
2. CSS input goes through `cssToReactNativeLoader`.
3. `cssToReactNativeLoader` calls `@startupjs/css-to-react-native-transform` to produce React Native style objects.

`packages/loaders/compilers/*` wrap the loaders for synchronous direct use from Babel and strip the generated `module.exports =` prefix.

### Stylus Loader

`packages/loaders/stylusToCssLoader.js`:

- creates a Stylus compiler for the source.
- sets `filename` for error reporting/import resolution.
- defines `$PLATFORM` and `__WEB__`, `__IOS__`, `__ANDROID__`, etc. when a platform is provided.
- auto-imports `@startupjs/ui/styles/index.styl` and `@startupjs-ui/core/styles/index.styl` if those packages are installed.
- auto-imports `styles/index.styl` from `process.cwd()` if present.
- applies `patchStylusAddUnit()` once.

`patchStylusAddUnit()` monkey-patches Stylus units so `1u` is converted to `8px` during Stylus compilation.

### CSS-to-RN Loader

`packages/loaders/cssToReactNativeLoader.js`:

- calls `@startupjs/css-to-react-native-transform` with media queries, part selectors, and keyframes enabled.
- supports `:export { ... }` values and converts exported Stylus values into JS values.
- adds `__hash__` to the compiled object for memoization keys.
- adds `__vars` with sorted CSS variable names when `var(...)` is present.
- adds `__hasMedia` when top-level `@media` rules exist.
- returns JS source in the shape `module.exports = { ... }`.

The metadata fields are consumed by `packages/runtime/process.js` and `packages/runtime/processCached.js`; changing them requires coordinated runtime updates.

## Runtime

Runtime entrypoints live in `packages/runtime/entrypoints/*`. Each entrypoint:

1. injects platform helpers through `setPlatformHelpers()`.
2. initializes the dimensions updater.
3. exports either the normal `process` function or the teamplay-cached `process` function.

The facade package re-exports these entrypoints from `packages/cssxjs/runtime/*` and provides both default and named `runtime` exports, because the Babel plugin imports `{ runtime as _runtime }`.

### Platform Helpers

`packages/runtime/platformHelpers/index.js` stores the active helper implementation. Helpers provide:

- `getDimensions()`
- `getPlatform()`
- `isPureReact()`
- `initDimensionsUpdater()`

`platformHelpers/web.js` uses `window.innerWidth`/`innerHeight`, falls back to `1024x768` without `window`, reports platform `web`, and marks pure React mode true.

`platformHelpers/react-native.js` uses React Native `Dimensions` and `Platform`, reports pure React mode false, and listens for dimension changes.

The runtime logs and throws if helpers are missing, which usually means Babel imported the wrong runtime entrypoint.

### Variables and Dimensions

`packages/runtime/variables.js` exports:

- default observable `variables` object.
- mutable `defaultVariables`.
- `setDefaultVariables()`.

Resolution order is:

1. runtime `variables['--name']`
2. `defaultVariables['--name']`
3. inline fallback from `var(--name, fallback)`

`packages/runtime/dimensions.js` exports an observable `{ width: 0 }` singleton plus an initialization flag.

Both observables come from `@nx-js/observer-util`. The uncached runtime reads these observables while processing styles; the cached runtime reads them in its `forceUpdateWhenChanged` hook.

### `process()`

`packages/runtime/process.js` is the main runtime function:

```js
process(styleName, fileStyles, globalStyles, localStyles, inlineStyleProps)
```

It:

1. transforms each style object:
   - replaces CSS variables when `__vars` exists.
   - listens to dimensions when `__hasMedia` exists.
   - applies media queries and viewport units through vendored processors.
2. calls `matcher()`.
3. flattens nested specificity arrays into single style objects.
4. adjusts pure React values such as numeric `lineHeight` to `px` strings.
5. applies runtime `u` unit replacement for string values that still contain `u`.

### `matcher()`

`packages/runtime/matcher.js` is intentionally simple and class-only.

Input `styleName` is normalized through an embedded classcat-style function. Supported shapes are strings, arrays, and object flags.

For each selector in each style object:

- `:part(name)` or `::part(name)` targets prop `nameStyle`.
- no part selector targets root prop `style`.
- `part(root)` is handled by Babel as root `style`, not by the matcher.
- selectors are matched by checking whether every class in the selector exists in the normalized `styleName`.
- selector specificity is approximated by number of classes.

Application order is:

1. file styles
2. global inline templates
3. local inline templates
4. inline style props

Because `process()` flattens and `Object.assign`s in that order, later layers override earlier layers. Within each layer, selectors with more classes override selectors with fewer classes.

There is also a legacy matcher mode when `inlineStyleProps` is omitted. It returns only root style arrays and exists for older `*StyleName` conversion behavior.

### Cached Runtime

`packages/runtime/processCached.js` wraps `process()` with `teamplay/cache` `singletonMemoize`.

The cache normalizer hashes:

- `styleName`
- each style object's `__hash__` or full object
- `inlineStyleProps`

The cache invalidation hook watches:

- `dimensions.width` when any style object has `__hasMedia`.
- specific variables listed in `__vars`.

The cached runtime depends on `teamplay` being installed. It is selected explicitly with `cache: 'teamplay'` or implicitly by importing `observer` from `teamplay` or `startupjs`.

## Component Parts

Parts are a two-sided compile-time and runtime protocol.

Parts are only addressable from the outside. A component styles its own elements with its own class selectors, such as `.text`; parent components use `:part(text)` against the child's exposed `part='text'` element.

On the parent side, a selector like:

```stylus
.card:part(title)
  color red
```

is compiled as a selector that `matcher()` returns under `titleStyle` when the parent element has styleName `card`.

On the child side, JSX like:

```jsx
function Card ({ title }) {
  return <Text part='title'>{title}</Text>
}
```

is rewritten so the closest likely React component accepts `titleStyle` and appends it to the element's root `style` prop. If props are destructured, the Babel plugin injects missing part style variables into the destructuring pattern. If no props parameter exists, it creates one.

`part='root'` is special. It maps to `style`, so parent styles for a component's own class can reach the component's root element without a `rootStyle` prop.

Part names must be statically knowable. Supported `part` values are:

- string literals, including space-separated parts.
- arrays of string literals and object expressions.
- object expressions with static keys and dynamic truthy/falsy values.

Unsupported dynamic part names intentionally throw at build time.

## CSS Semantics and Limits

Supported features are constrained by React Native style capabilities and `@startupjs/css-to-react-native-transform`.

Supported in current code and docs:

- class selectors and compound class selectors.
- `&` parent selector in Stylus.
- `:part(name)` and `::part(name)`.
- CSS variables in full or compound values.
- media queries.
- viewport units through the vendored dynamic style processor.
- keyframes, animation, and transition output from the CSS-to-RN transformer.
- `u` unit, where `1u = 8px`.
- `:export` blocks in style files.

Not supported by design:

- expression interpolation inside `css` or `styl` template literals.
- descendant selectors.
- attribute selectors.
- web pseudo-classes such as `:hover`, `:focus`, and `:active`.
- pseudo-elements such as `::before` and `::after`.

## Pug, Type Checking, and Linting

CSSX does not implement the Pug parser itself. It wraps React Pug tooling:

- Babel transform: `@react-pug/babel-plugin-react-pug`.
- type checker: `@react-pug/check-types`.
- ESLint processor: `@react-pug/eslint-plugin-react-pug`.

`packages/cssxjs/cli.js` implements:

```sh
npx cssxjs check [files...] [--project <tsconfig-path>]
```

and delegates to `packages/cssxjs/check.js`, which re-exports `@react-pug/check-types`.

`eslint-plugin-cssxjs` is a package-name facade over `@react-pug/eslint-plugin-react-pug`, so changes to lint behavior usually belong upstream unless the wrapper API changes.

## Metro and Separate Style Files

Inline `css`/`styl` templates are handled by Babel and do not require Metro configuration.

Separate `.cssx.styl` files need bundler support for hot reloading. `packages/bundler/metro-config.js`:

- starts from Expo, React Native 0.73+, or older Metro default config.
- sets `babelTransformerPath` to CSSX's Metro transformer.
- adds `css` and `styl` to `resolver.sourceExts`.
- enables package exports.
- disables Expo's CSS support when using Expo defaults.

`packages/bundler/metro-babel-transformer.js`:

- compiles `.styl` through Stylus then CSS-to-RN.
- compiles `.css` through CSS-to-RN.
- passes resulting JS source to the upstream Metro Babel transformer.

This path is primarily for imported style files and hot reloading. The preferred component-local path remains inline templates or Pug embedded style blocks.

## Example App

`example/` is a pure web demonstration:

- `example/server.js` starts an HTTP server on port 3000.
- `example/_serveClient.js` runs Babel with `cssxjs/babel`, then bundles with esbuild from memory.
- `example/client.tsx` demonstrates Pug, embedded Stylus, `styleName`, `part`, media queries, and external `.cssx.styl` import.

Run it with:

```sh
yarn start
```

from the repository root.

## Testing

Root script:

```sh
yarn test
```

This loops over every `packages/*` directory and runs each package's `yarn test`.

Useful targeted tests:

```sh
cd packages/runtime && yarn test
cd packages/babel-plugin-rn-stylename-inline && yarn test
cd packages/babel-plugin-rn-stylename-to-style && yarn test
```

Runtime tests live in `packages/runtime/test/*.mjs`.

Babel plugin tests use `babel-plugin-tester` and Jest snapshots in:

- `packages/babel-plugin-rn-stylename-inline/__tests__/`
- `packages/babel-plugin-rn-stylename-to-style/__tests__/`

Many packages currently have placeholder tests that print `No tests yet`.

## Maintenance Constraints

- Treat `__CSS_GLOBAL__`, `__CSS_LOCAL__`, `__hash__`, `__vars`, and `__hasMedia` as cross-package contracts.
- Keep Babel transform order intact unless the replacement order is tested.
- Keep runtime import wrappers in `packages/cssxjs/runtime/*` compatible with the named `runtime` import used by the Babel plugin.
- If selector matching changes, update `matcher` tests and process integration tests together.
- If CSS variable metadata changes, update both cached and uncached runtime paths.
- If media-query metadata changes, update dimensions invalidation in cached and uncached runtime paths.
- If part injection changes, update tests for destructured props, named props, nested render functions, `root`, and dynamic parts.
- If default style file extensions change, update docs, Babel plugin defaults, Metro expectations, and tests together.
- Be careful with old package READMEs. Some historical README text still references StartupJS-era names or older defaults; prefer current code and `docs/` for public behavior.
