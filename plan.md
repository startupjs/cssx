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

These were intentionally out of scope for the first unified-engine
implementation. The later "Global Theming And Provider Styles Workstream"
below explicitly reopens provider-scoped variables, `:root`, component tag
selectors, modern color math, Tailwind utilities, and StartupJS UI migration.

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

## Global Theming And Provider Styles Workstream

This section captures the next batch of agreed work after the unified engine
implementation. It moves global theming, component tag overrides, scoped CSS
variables, and optional Tailwind utilities into CSSX primitives, then migrates
StartupJS and StartupJS UI onto those primitives.

Work should happen on separate branches in the involved repos:

- `cssx`: `cssx-theme-provider-plan`
- `startupjs`: `cssx-provider-integration`
- `startupjs-ui`: `cssx-theme-migration`

Do not treat this as a StartupJS UI-only redesign. CSSX must expose generic
building blocks that standalone CSSX users can use without StartupJS. StartupJS
then re-exports CSSX APIs and wires them into its framework provider. StartupJS
UI becomes a consumer that ships a default theme and components which opt into
CSSX global customization.

### Goals

- Add provider-level global CSSX sheets.
- Let provider sheets define scoped `:root` CSS custom properties.
- Let provider sheets define global utility classes.
- Add first-class component tag selectors for globally themeable components.
- Move the `themed()` primitive into CSSX and re-export it from `startupjs`.
- Make StartupJS UI use CSSX primitives instead of owning the theme engine.
- Replace StartupJS UI's JS palette/color object system with CSS-first
  variables and CSS color functions where possible.
- Add enough modern color math to reproduce the current StartupJS UI theme
  structure in pure CSS.
- Add an optional Tailwind preset/layer that can be consumed by CSSX provider
  styles and `cssx()`.
- Add a conditional legacy flag for migration testing.

### Provider API

`CssxProvider` should accept a direct `style` prop:

```tsx
<CssxProvider style={globalStyle}>
  <App />
</CssxProvider>
```

`style` accepts the same layer inputs as `cssx()`:

```ts
type CssxProviderStyle =
  | string
  | CompiledCssSheet
  | TrackedCssxSheet
  | CssxUtilityLayer
  | readonly CssxProviderStyle[]
  | null
  | undefined
  | false
```

Raw CSS strings compile at runtime with the same graceful diagnostics model as
`useRuntimeCss()`. Compiled sheets and tracked sheets should work during SSR.
Arrays flatten like React style arrays: ignore falsey values, preserve order,
and let later layers override earlier layers.

`CssxProvider` should continue to support runtime configuration, either through
the existing `value` prop or a compatible shape. The provider style API should
be the ergonomic public path for global theme/style sheets.

Provider cascade order:

1. outer provider `style`
2. inner provider `style`
3. imported/file component styles
4. local `css` / `styl` templates
5. explicit inline style props

Child provider styles append after parent provider styles, so nested providers
can override parent themes. StartupJS UI `UiProvider style` should override the
StartupJS UI default theme.

### StartupJS Provider Integration

Standalone CSSX users use `CssxProvider` directly.

StartupJS framework users normally use `StartupjsProvider`; StartupJS should
wire its provider `style` prop into CSSX through its plugin/provider hook layer.
That lets apps write:

```tsx
<StartupjsProvider style={[tailwindTheme, appTheme]}>
  <App />
</StartupjsProvider>
```

without manually adding a separate CSSX provider. `startupjs` already re-exports
`css`, `styl`, and other CSSX APIs; it should also re-export the new provider,
variable, and theming APIs.

StartupJS UI should not own this framework integration. It should provide an
inner provider for its own default component theme.

### StartupJS UI Provider Integration

StartupJS UI should ship a default theme sheet as pure `.css` where possible,
not Stylus unless Stylus features become necessary.

`UiProvider` should wrap its children with:

```tsx
<CssxProvider style={[startupjsUiDefaultTheme, props.style]}>
  {children}
</CssxProvider>
```

This makes StartupJS UI self-contained when used outside the full StartupJS
framework. The app can still pass a stronger override sheet through
`UiProvider style`.

The total common cascade is:

1. outer app/framework provider style
2. StartupJS UI default theme
3. `UiProvider style` overrides
4. component file/local/inline styles

StartupJS UI should stop seeding global `defaultVariables` for its theme. The
default UI variables move entirely into the default theme CSS sheet.

### Provider `:root` Variables

Provider `:root` declarations are scoped to that provider subtree. They should
behave like CSS custom properties in web CSS: nested providers can override
outer variables without mutating singleton global runtime variables.

Example:

```css
:root {
  --color-primary: oklch(62% 0.18 250);
  --Button-height-m: 32px;
}
```

Compiled sheets should preserve root custom properties as structured metadata,
for example `sheet.rootVariables`, not as legacy top-level style objects. Expose
helpers such as:

```ts
getRootVariables(sheet): Record<string, string>
```

The exact name can change, but StartupJS UI must not depend on
`style[':root']` anymore.

Variable precedence, highest to lowest:

1. interpolation/template values used by the current layer
2. global imperative `variables['--x']`
3. nearest provider `:root` variable
4. outer provider `:root` variable
5. global `defaultVariables`
6. inline `var(--x, fallback)`

This keeps current global runtime variables powerful and backward compatible,
while provider variables behave as scoped defaults.

### Variable Store API

Keep `variables` and `defaultVariables` as object-like proxies, but make them
stricter and add bulk methods directly on the proxies:

```ts
variables['--x'] = 'red'
delete variables['--x']

variables.assign({
  '--x': 'red',
  '--y': 'blue'
})

variables.set({
  '--x': 'red'
})

variables.clear()
variables.clear(['--x', '--y'])

defaultVariables.set({
  '--x': 'red'
})
```

`setDefaultVariables(vars)` remains as a compatibility alias for
`defaultVariables.set(vars)`.

Validation:

- only valid CSS custom property names are allowed, practically
  `/^--[A-Za-z0-9_-]+$/`
- invalid writes throw in every environment
- methods are reserved non-variable properties and should not be enumerable
- bulk operations validate everything before mutating anything
- notify once per bulk operation with exactly changed/removed variable names

Provider `:root` variables are CSS strings. Imperative global variables should
be CSS-first and documented as strings/numbers. Object values with meaningful
`toString()` can remain tolerated for migration, but StartupJS UI should stop
depending on object-valued variables.

### Variable Read APIs

Expose provider-aware and global-only variable readers:

```ts
useCssVariable(name: string, fallback?: unknown): unknown
useCssVariableRaw(name: string, fallback?: string): string | undefined

getCssVariable(name: string, fallback?: unknown): unknown
getCssVariableRaw(name: string, fallback?: string): string | undefined
```

`useCssVariable()`:

- React-only
- provider-aware
- subscribed to exactly the variables used, including nested `var()`
  dependencies
- returns RN-friendly values by default

`getCssVariable()`:

- global-only
- not provider-aware
- not subscribed
- useful outside render or in non-React code

Internal pure helpers should exist for explicit contexts, for example
`resolveCssVariable(name, context)`.

RN-friendly value behavior:

- `32px` -> `32`
- `4u` -> `32`
- unitless number -> number
- `%` remains string
- colors and computed color functions -> RN-compatible color strings
- complex RN-accepted strings remain strings
- unsupported values return fallback or `undefined` and report diagnostics in
  development paths

Raw helpers return the resolved CSS string before RN coercion.

### Inline Style `var()` Resolution

CSSX should resolve `var()` inside inline style props when those props flow
through CSSX:

```tsx
<View styleName="root" style={{ backgroundColor: 'var(--color-bg-main)' }} />
```

or:

```ts
cssx('root', sheet, { backgroundColor: 'var(--color-bg-main)' })
```

This replaces StartupJS UI's brittle JSON-stringify-based
`useTransformCssVariables()` helper. Plain React Native `style={{ ... }}`
without CSSX cannot be intercepted.

Inline variable resolution must:

- use the same variable precedence as declarations
- track exact variable dependencies
- participate in cache keys/invalidation
- resolve nested `var()` and fallbacks
- apply RN-friendly value coercion

### Component Tag Selectors

Add component tag/type selectors for provider/global sheets:

```css
Button {
  background-color: red;
}

Button:part(text),
Button::part(text) {
  color: green;
}

Button.primary {
  border-color: var(--color-primary);
}

Button:part(icon).large {
  width: 24px;
}
```

Only tag selectors should be supported for global component defaults. Do not
support `.Button` as a long-term alias. StartupJS UI's breaking migration guide
should tell users to change `.Button` global overrides to `Button`.

Both `:part(name)` and `::part(name)` are long-term supported syntax.

Supported selector combinations for the first batch:

- `Tag`
- `Tag.class`
- `Tag:part(name)`
- `Tag::part(name)`
- `Tag:part(name).class`
- `Tag:hover`
- `Tag:active`
- class selectors and class part selectors, such as `.danger:part(icon)`

Defer descendant selectors such as `Button Text` or `Button .icon`. Parts are
the intended cross-boundary customization API.

Global utility classes should work without a component tag:

```css
.danger {
  border-color: var(--color-error);
}

.danger:part(text) {
  color: var(--color-error);
}
```

### `themed()`

The CSSX `themed()` primitive should live in CSSX, not StartupJS UI. StartupJS
re-exports it. StartupJS UI imports it from `startupjs`.

Recommended public APIs:

```ts
themed(tagName: string, Component: React.ComponentType<any>): React.ComponentType<any>
useThemeTag(): string | undefined
```

Implementation should use React 19 context with `use(Context)` where useful so
it does not depend on Babel threading hidden props through every element.

`cssx()` in React entrypoints may read the current theme tag from context during
render. Pure `resolveCssx()` remains framework-independent and takes an
explicit tag/component option.

Boundary behavior:

- `themed('Button', Button)` provides the current tag while rendering the
  component implementation.
- internal root and part elements in that component see the `Button` tag.
- nested themed components push their own tag.
- non-themed descendants inherit the nearest tag unless a future escape hatch
  is added.

Parts are explicit. Components must mark exposed internals with `part`:

```tsx
function Button({ children }) {
  return (
    <View part="root" styleName="root">
      <Text part="text" styleName="text">{children}</Text>
    </View>
  )
}

export default themed('Button', Button)
```

Do not infer parts from prop names like `textStyle` or `iconStyle`.

### Modern Color Math

CSSX should implement enough CSS color math to replace the current StartupJS UI
JS palette/color-object theme structure with CSS variables.

Use `@colordx/core` pinned exactly:

```json
"@colordx/core": "5.4.3"
```

The version is intentionally fixed because the package is less widely adopted
and CSSX will adapt to a specific API.

First batch support:

- `oklch(L C H / alpha?)`
- `oklab(...)`
- `rgb()` / `rgba()`
- `hsl()` / `hsla()`
- nested `var()` inside color function channels
- `calc()` inside color channels
- arithmetic for numeric/percentage channels where needed
- `color-mix()` implemented by CSSX using colordx primitives
- interpolation spaces for `color-mix()`:
  - `oklch`
  - `oklab`
  - `srgb`

Defer:

- hue interpolation flags, such as `longer hue`
- exotic color spaces such as `display-p3`
- full relative color syntax
- full CSS unit system inside color math

On React Native, modern color functions must be evaluated to RN-compatible
strings. On web, pass-through is allowed only if it does not complicate CSSX
variable resolution; otherwise normalize consistently on all platforms.

Default output for computed modern colors:

```text
rgba(r, g, b, a)
```

Plain authored colors such as `red` or `#fff` can remain as authored unless
they participate in computed color math.

StartupJS UI default theme should become CSS-first, for example:

```css
:root {
  --ui-primary-h: 250;
  --ui-primary-c: 0.18;
  --ui-primary-l: 62%;

  --color-primary: oklch(var(--ui-primary-l) var(--ui-primary-c) var(--ui-primary-h));
  --color-primary-strong: color-mix(in oklch, var(--color-primary), black 12%);
  --color-primary-transparent: color-mix(in srgb, var(--color-primary) 5%, transparent);

  --Button-height-m: 32px;
  --Button-disabledOpacity: 0.25;
}
```

### StartupJS UI Migration

StartupJS UI should stop managing global colors/palettes as its own framework
layer. It should ship a default CSSX theme and use CSSX primitives:

- `themed()` from `startupjs`
- `CssxProvider` through `startupjs`
- `useCssVariable()`
- `useCssVariableRaw()` only where raw CSS strings are necessary
- provider `style` overrides

Remove `Colors` compatibility in the breaking StartupJS UI release. Migration
docs should tell users to use string token names or CSS variable names.

Examples:

```ts
// old
color = Colors.primary
getColor(color)

// new
color = 'primary'
useCssVariable(`--color-${color}`)
```

Component-level vars use full custom property names:

```ts
const hoverBg = useCssVariable('--Div-hoverBg')
const height = useCssVariable('--Button-height-m')
```

Move configurable visual values from Stylus `:export` config objects into CSS
variables by default. Components can read variables with `useCssVariable()`
when JS needs the value. Keep true structural JS constants as JS constants when
they are not meaningful CSS/theme knobs.

Examples:

- good CSS variables:
  - radii
  - border widths
  - disabled opacity
  - colors
  - heights
  - font sizes
  - icon margins
- likely JS constants:
  - supported size names
  - icon component mappings
  - structural branching that cannot be a CSS value

### Optional Tailwind Support

Tailwind support should be optional and imported explicitly:

```ts
import { tailwind } from 'cssxjs/tailwind'
```

Implementation shape:

- create a separate package/adapter, likely `@cssxjs/tailwind`
- `cssxjs` may depend on it and expose a separate export entry
- it is only bundled by clients that import `cssxjs/tailwind`
- depend on `@mgcrea/react-native-tailwind` pinned exactly, initially:

```json
"@mgcrea/react-native-tailwind": "0.16.0"
```

Reuse `@mgcrea/react-native-tailwind` for Tailwind token parsing/config support
where possible. Do not reimplement the whole Tailwind utility table unless the
adapter API blocks CSSX integration.

`tailwind()` returns a CSSX layer/preset:

```tsx
const tw = tailwind({
  theme: {
    extend: {
      colors: {
        primary: '#1d4ed8'
      }
    }
  }
})

<CssxProvider style={[tw, uiTheme, appOverrides]}>
  <App />
</CssxProvider>
```

Users can then write:

```tsx
<View styleName="flex-1 bg-gray-100 p-4" />
```

No separate `tw()` helper is needed in the first batch. Users can call the
normal CSSX runtime if they need manual props:

```ts
cssx('flex-1 bg-gray-100 p-4', tw)
```

Arbitrary utilities such as `w-[123px]` cannot be pre-generated. The Tailwind
layer should expose a virtual utility resolver used during `cssx()` resolution:

- finite generated sheet for standard utilities/default vars when useful
- virtual `resolveUtilityClass(className)` for arbitrary/dynamic classes
- diagnostics for unsupported utilities
- bounded cache behavior consistent with CSSX caching rules

Tailwind config:

- build-time/Node can discover `tailwind.config.{js,cjs,mjs,ts}` from project
  root when appropriate
- runtime/client cannot use filesystem discovery
- allow explicit config object
- users can layer Tailwind with their own StartupJS UI/app overrides through
  provider style arrays

### Legacy Migration Flag

Add a conditional legacy flag for migration testing:

```js
// babel-preset-cssxjs / babel-preset-startupjs
{
  cssxLegacy: true
}
```

Also support an env override:

```sh
CSSX_LEGACY=0 yarn build
CSSX_LEGACY=1 yarn build
```

Default: `true` for the migration release.

When legacy is enabled:

- `matcher` compatibility export works
- loader emits legacy top-level static style-map entries such as
  `STYLES.button`

When legacy is disabled:

- `matcher()` throws a clear migration error
- old top-level static style-map entries are not generated
- direct `STYLES.button` reads fail loudly

The flag must reach both Babel and Metro/file-loader paths:

- Babel preset passes `cssxLegacy` to inline/styleName plugins
- Babel plugin can fail fast for `import { matcher } from 'startupjs'` or
  `cssxjs`
- Metro transformer passes `cssxLegacy` to `cssToReactNativeLoader`
- StartupJS Babel preset and Metro config expose/pass the same option

CSSX/StartupJS should keep legacy default-on for one migration release, then
flip default or remove it in a later major after real apps pass with
`CSSX_LEGACY=0`.

### Diagnostics

Provider raw CSS diagnostics should be visible and controlled:

- raw provider strings compile through `useRuntimeCss()`
- expose diagnostics through a hook such as `useCssxDiagnostics()`
- development warns once per sheet/cache key unless silenced
- production does not warn by default
- diagnostics remain available to tooling and AI-generated CSS workflows

### SSR

Provider global styles should work during SSR:

- compiled sheets work synchronously
- raw strings compile synchronously
- scoped provider variables resolve deterministically
- media queries use current CSSX dimensions fallback/config
- subscriptions use the existing server snapshot path and do not attach
  browser listeners

### Implementation Phases For This Workstream

1. **Core provider layer model**
   - extend `CssxProvider` with `style`
   - normalize provider layer arrays
   - include provider layers in React `cssx()` resolution
   - add provider diagnostics plumbing
   - add SSR tests

2. **Root variable metadata and scoped resolution**
   - compile `:root` custom properties into sheet metadata
   - add provider scoped variable stack
   - update `resolveCssValue()` to accept scoped variable layers
   - implement variable precedence
   - add nested provider tests

3. **Variable proxy methods and read APIs**
   - validate variable names
   - add `variables.set/assign/clear`
   - add matching `defaultVariables` methods
   - keep `setDefaultVariables()` compatibility
   - add `useCssVariable`, `useCssVariableRaw`, `getCssVariable`,
     `getCssVariableRaw`
   - test exact subscriptions and bulk notification behavior

4. **Inline style variable resolution**
   - resolve inline style strings containing `var()`
   - track dependencies
   - convert scalar CSS values to RN-friendly JS values
   - update cache tests for inline variable changes

5. **Component tag selectors and `themed()`**
   - extend selector IR with optional component tag
   - support tag/class/part/pseudo combinations
   - add `themed()` and theme tag context
   - make React `cssx()` read theme tag context
   - keep pure `resolveCssx()` explicit and framework-independent
   - test parts, nested themed components, inherited tag behavior, and utility
     classes

6. **Modern color math**
   - add `@colordx/core@5.4.3`
   - evaluate OKLCH/OKLab/RGB/HSL and channel `calc()`
   - implement `color-mix()` for `oklch`, `oklab`, and `srgb`
   - normalize computed modern colors to `rgba(...)`
   - add RN and web target tests

7. **Legacy flag**
   - thread `cssxLegacy` through CSSX Babel preset/plugins/loaders/Metro
   - thread same option through StartupJS Babel preset/Metro integration
   - make legacy-off throw for `matcher()`
   - make legacy-off omit static map entries
   - test both modes in CSSX and real apps

8. **Optional Tailwind adapter**
   - add `@cssxjs/tailwind`
   - expose `cssxjs/tailwind`
   - adapt `@mgcrea/react-native-tailwind@0.16.0`
   - add CSSX utility layer interface if needed
   - support config object and Node config discovery
   - test standard and arbitrary utilities

9. **StartupJS integration**
   - re-export new CSSX APIs from `startupjs`
   - wire `StartupjsProvider style` into `CssxProvider`
   - expose `cssxLegacy` in StartupJS Babel/Metro config paths
   - test Dating and other real apps with `CSSX_LEGACY=1` and `0`

10. **StartupJS UI migration**
    - add default `.css` theme sheet
    - wrap `UiProvider` in `CssxProvider`
    - replace current `themed()` implementation with CSSX `themed()`
    - replace direct `matcher` usage
    - replace direct `STYLES.class` reads with `cssx()` or CSS variables
    - move configurable `:export` values to CSS variables where appropriate
    - remove `Colors` compatibility
    - update docs and migration guide from `.Button` to `Button`

### Required Tests

CSSX engine tests:

- `:root` extraction
- provider scoped variable precedence
- nested provider overrides
- global variables overriding provider vars
- `variables.set/assign/clear`
- invalid variable names throwing
- `useCssVariable()` exact subscriptions
- inline style `var()` resolution and cache invalidation
- tag selectors and class selectors together
- `:part()` and `::part()`
- `:hover` and `:active` on tag selectors
- utility classes from provider sheets
- runtime raw provider CSS diagnostics
- SSR provider resolution
- OKLCH conversion
- `calc()` in OKLCH channels
- `color-mix()` in `oklch`, `oklab`, and `srgb`
- unsupported color diagnostics
- legacy on/off behavior
- Tailwind standard utilities
- Tailwind arbitrary utilities

StartupJS tests:

- `StartupjsProvider style` wraps CSSX provider
- CSSX APIs re-export from `startupjs`
- Babel/Metro `cssxLegacy` flag propagates

StartupJS UI tests:

- default theme variables available through `UiProvider`
- `UiProvider style` overrides default theme
- component tag overrides apply to roots and explicit parts
- `.Button` overrides no longer work in new docs/tests
- migrated components no longer import/use `matcher`
- migrated components no longer depend on top-level `STYLES.class` entries

Real app migration checks:

- run Dating with `CSSX_LEGACY=1`
- run Dating with `CSSX_LEGACY=0`
- repeat on other StartupJS apps before flipping/removing legacy

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
- re-exports `compileCss`, `cssx`, `useRuntimeCss`, `CssxProvider`,
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

export function useRuntimeCss(
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
import { compileCss, cssx, useRuntimeCss } from 'cssxjs'

const sheet = compileCss(generatedCss)

function Button({ disabled, style }) {
  const trackedSheet = useRuntimeCss(generatedCss)

  return (
    <Div {...cssx(['root', { disabled }], trackedSheet, { style })} />
  )
}
```

Convenience raw string usage is allowed:

```tsx
<Div {...cssx('root', generatedCss)} />
```

But documented React usage should prefer `useRuntimeCss()` so subscriptions,
diagnostics, and parsing are controlled.

### `cssx()` Ergonomics

Do not require a `useCssx()` hook per element. The user should be able to write:

```tsx
const sheet = useRuntimeCss(generatedCss)

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
const sheet = useRuntimeCss(generatedCss)

return (
  <>
    <Div {...cssx('root', sheet)} />
    <Span {...cssx('label', sheet)} />
  </>
)
```

`useRuntimeCss()` returns a tracked wrapper, not the plain JSON IR. The wrapper:

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
const sheet = useRuntimeCss(generatedCss)
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

- `useRuntimeCss()` returns tracked wrapper
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
- Implement `useRuntimeCss()`, `useCssxSheet()`, `useCssxTemplate()`.
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
- `cssx()` and `useRuntimeCss()`
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

## CSS-First StartupJS UI Refactor Workstream

This workstream supersedes and refines the earlier StartupJS UI migration and
optional Tailwind notes in the "Global Theming And Provider Styles Workstream".
The earlier unified CSS engine work remains valid; this section defines the next
large batch: move StartupJS UI away from Stylus, old palette helpers, separate
component style files, and startupjs-ui-owned style primitives.

Treat the CSSX, StartupJS, and StartupJS UI PRs as connected draft PRs during
this work. It is acceptable to keep temporary cross-repo development wiring,
such as `resolutions`, local file links, or linked packages, while implementing
and validating the batch. Remove that temporary wiring in a final cleanup pass
before the PRs become merge-ready. Commit and push regularly as meaningful
sub-batches land.

### Goals

- Use CSSX standards-oriented CSS as the foundation for StartupJS UI styling.
- Replace Stylus functions, mixins, `$UI` config, and `u`-based scales with CSS
  variables, `rem`, `calc()`, `oklch()`, `color-mix()`, `@custom-media`, and
  component tag/part overrides.
- Use Tailwind CSS variables as the raw token scale.
- Use shadcn semantic variables as the primary theme override surface.
- Let StartupJS UI components consume semantic `--color-*`, `--spacing`,
  `--radius-*`, `--text-*`, breakpoint, and component-specific variables.
- Keep Tailwind utility class runtime support optional and separate from the
  token/theme preset.
- Move generic style-related JS bridges into CSSX and re-export them from
  `startupjs`.
- Remove style-related helpers from `@startupjs-ui/core`.
- Inline StartupJS UI component styles into component files instead of separate
  `.cssx.styl` / `.cssx.css` files.
- Keep `@startupjs-ui/core` only as a small shared non-style type/helper package,
  currently for `UIRole`.

### Non-Goals

- Do not make bare StartupJS include Tailwind/shadcn themes by default.
- Do not make StartupJS UI depend on Tailwind utility classes internally.
- Do not implement the optional Tailwind utility runtime in this batch unless it
  becomes necessary for validation.
- Do not preserve old StartupJS UI theme token names as the new API. This is a
  breaking release; users should migrate to the new tokens.
- Do not support Tailwind's non-standard `@theme` syntax in the CSSX compiler.
  Theme assets are plain CSSX-compatible CSS.

### CSSX Theme Assets

CSSX should ship reusable theme asset entrypoints:

```ts
import tailwindTheme from 'cssxjs/themes/tailwind'
import shadcnTheme from 'cssxjs/themes/shadcn'
```

The entrypoints internally export readable `.cssx.css` assets. Do not document
direct `.cssx.css` imports as public API. Docs can link to the source files as
the reference for all customizable variables.

Theme source files:

- `tailwind.cssx.css`
  - manually copied/adapted from the current Tailwind `theme.css`
  - all Tailwind variables included where CSSX can reasonably represent them
  - plain `:root` CSS variables, no `@theme`
  - transform Tailwind-specific `--theme(...)` expressions into plain
    CSS-compatible variable/fallback expressions or omit only truly irrelevant
    unsupported pieces
- `shadcn.cssx.css`
  - one default shadcn theme with a dark variant
  - light/default values in `:root`
  - dark values in `:root.dark`
  - semantic override tokens such as `--primary` and `--primary-foreground`
  - Tailwind consumption mappings such as `--color-primary:
    var(--primary)` and `--color-primary-foreground:
    var(--primary-foreground)`

Do not add an auto-regeneration script. The Tailwind and shadcn variable names
are stable enough for manual updates. Add source comments to the files so future
updates are reviewable.

StartupJS UI should not duplicate the full Tailwind/shadcn files. It should use
CSSX theme entrypoints and own only its component-specific theme layer.

### Theme Selection Model

`CssxProvider` owns theme selection:

```tsx
<CssxProvider theme='auto' style={style}>
  <App />
</CssxProvider>
```

`theme` values:

- `auto`: default. Uses OS color scheme and applies `dark` if the active
  provider styles define a dark theme block.
- `dark`: applies `:root` plus `:root.dark`.
- `default`: applies only `:root`.
- `light`: alias for default unless an explicit `:root.light` block exists.
- any custom name: applies `:root` plus `:root.<name>`.

Theme variable blocks:

```css
:root {
  --background: oklch(1 0 0);
  --color-background: var(--background);
}

:root.dark {
  --background: oklch(0.145 0 0);
  --color-background: var(--background);
}
```

Rules:

- `:root` and `:root.<theme>` are variable blocks only.
- Only CSS custom property declarations are valid inside them.
- Normal declarations inside root/theme blocks produce diagnostics and are
  ignored.
- Provider layers collect `:root` and `:root.<theme>` variables into scoped
  provider variable maps.
- Component-local sheets should not be used to define global/provider theme
  variables. Emit a diagnostic if a component-local sheet contains root/theme
  custom properties unless it is explicitly used as a provider layer.
- Bare CSSX has no bundled variables, so `theme='auto'` is a no-op until the app
  provides a style layer with `:root.dark`.

OS color-scheme integration:

- Web: `matchMedia('(prefers-color-scheme: dark)')`.
- React Native: `Appearance.getColorScheme()` and
  `Appearance.addChangeListener`.
- Batch theme-change invalidation through the same runtime store/subscription
  system used for variables, media, and dimensions.
- Providers with explicit themes do not need OS color-scheme subscriptions.
- Providers with `theme='auto'` subscribe and update when OS color scheme
  changes.

### Theme-Specific Styles

Theme-specific normal styles use built-in CSSX theme media aliases, not root
theme blocks:

```css
Button {
  box-shadow: var(--shadow-sm);
}

@media (--theme-dark) {
  Button {
    box-shadow: none;
    border-color: var(--color-border);
  }
}
```

Rules:

- `@media (--theme-dark)` matches active theme `dark`.
- `@media (--theme-light)` and `@media (--theme-default)` match default/light.
- `@media (--theme-<name>)` matches a custom active theme name.
- Built-in `--theme-*` aliases are dynamic and independent of user
  `@custom-media` declarations.
- User-defined `@custom-media --theme-*` should produce a diagnostic because it
  collides with CSSX's built-in theme media namespace.
- Theme media aliases compose with custom media and ordinary media:

```css
@media (--theme-dark) and (--breakpoint-desktop) {
  Button { border-width: 1px; }
}
```

### Custom Media And Breakpoints

CSSX should support standard `@custom-media`:

```css
:root {
  --mobile: 0rem;
  --tablet: var(--breakpoint-md);
  --desktop: var(--breakpoint-lg);
  --wide: var(--breakpoint-xl);
}

@custom-media --breakpoint-mobile (width < var(--tablet));
@custom-media --breakpoint-tablet (width >= var(--tablet));
@custom-media --breakpoint-desktop (width >= var(--desktop));
@custom-media --breakpoint-wide (width >= var(--wide));
```

Tailwind raw breakpoint variables should stay available:

```css
--breakpoint-sm: 40rem;
--breakpoint-md: 48rem;
--breakpoint-lg: 64rem;
--breakpoint-xl: 80rem;
--breakpoint-2xl: 96rem;
```

CSSX media evaluation must support Media Queries Level 4 range syntax for the
common width/height comparisons used by custom media:

- `(width >= 48rem)`
- `(width > 48rem)`
- `(width <= 48rem)`
- `(width < 48rem)`
- same for `height`

If `css-mediaquery` cannot evaluate range syntax accurately, implement a small
normalizer/evaluator for these comparisons instead of relying on lossy
conversion.

`useMedia()` moves to CSSX and is re-exported through `startupjs`.

Behavior:

- reads active `@custom-media` aliases from provider layers
- includes built-in fallback aliases when none are defined:
  - `mobile`: width < 48rem
  - `tablet`: width >= 48rem
  - `desktop`: width >= 64rem
  - `wide`: width >= 80rem
- provider-defined aliases override fallbacks
- returns a map with normalized names:
  - `--breakpoint-tablet` -> `media.tablet`
  - `--compact` -> `media.compact`
- subscribes only to media/dimension changes that affect the aliases read by the
  hook

### CSSX Color Bridge

Move generic JS color bridging into CSSX and re-export it from `startupjs`.
StartupJS UI should use this instead of `colorToRGBA` and token helpers from
`@startupjs-ui/core`.

Use a single API, not separate color and color-mix functions:

```ts
const color = useCssColor('primary')
const foreground = useCssColor('primary-foreground')
const subtle = useCssColor('primary', 0.15)
const onWhite = useCssColor('primary', { mix: 0.3, with: 'white' })

const globalColor = getCssColor('primary')
```

Input resolution:

- `primary` -> `var(--color-primary)`
- `primary-foreground` -> `var(--color-primary-foreground)`
- `var(--custom)` -> exact expression
- raw CSS color -> raw expression
- `--primary` is ambiguous and should not be supported

Mixing:

- no mix returns the resolved RN-friendly color value
- numeric mix such as `0.15` means 15%
- string mix such as `'15%'` is allowed
- object form supports `{ mix, with }`
- default `with` is `transparent`
- implemented through the same CSS value/color resolver as `color-mix()`

Tracking:

- `useCssColor()` is provider-aware and subscribes to all variables used by the
  color expression and mix target.
- `getCssColor()` is an imperative escape hatch for global/default variable
  reads and non-React code. It is not provider-aware in the first batch.

Prefer CSS `var()` and `color-mix()` in component stylesheets/templates. Use
`useCssColor()` only for JS-only bridges to non-CSSX props or inline style
composition that cannot be expressed cleanly in CSS.

### Deprecated `u`

Move JS `u()` to CSSX/startupjs as a deprecated helper:

```ts
u(1) // 8
```

Rules:

- `1u === 0.5rem === 8px`
- warn once in development: use `rem`, `var(--spacing)`, or CSS instead
- keep it for migration of existing JS inline styles
- StartupJS UI internals should stop using it

CSSX should continue compiling existing CSS `u` units for compatibility, but
emit deprecated-unit diagnostics in build mode. New StartupJS UI styles should
use:

- `rem`
- `calc(var(--spacing) * n)`
- Tailwind/shadcn/component CSS variables

### Tailwind Utility Runtime

The optional Tailwind utility runtime is a follow-up. This batch should prepare
the interfaces and token model, but should not depend on utility classes.

When implemented, `tailwind()` should be imported explicitly from a separate
entrypoint and only bundled by clients that import it.

Utility interoperability requirement:

- utilities should read active `--color-*` variables dynamically
- if provider styles define `--color-warning`, `bg-warning`, `text-warning`,
  `border-warning`, etc. can resolve through that variable
- this works even if `warning` is not in the original Tailwind config
- cache invalidation must include the variables used by resolved utilities
- arbitrary classes like `w-[15px]` belong to the optional utility runtime, not
  the base theme layer

StartupJS UI must not use Tailwind utility classes internally. It uses the same
tokens through normal CSS.

### StartupJS Provider Integration

Bare StartupJS:

- `StartupjsProvider style` feeds CSSX provider styles.
- `StartupjsProvider theme` feeds CSSX theme selection.
- Bare StartupJS does not include Tailwind/shadcn themes automatically.
- Users can explicitly import CSSX theme entrypoints if they want them.

StartupJS with startupjs-ui installed:

- startupjs-ui plugin injects the internal `UiProvider` into
  `StartupjsProvider`.
- App users configure one place:

```tsx
<StartupjsProvider theme='auto' style={appStyle}>
  <App />
</StartupjsProvider>
```

Effective style order should let app overrides beat UI defaults:

1. `tailwindTheme`
2. `shadcnTheme`
3. `startupjsUiTheme`
4. forwarded `StartupjsProvider style` overrides
5. component-local styles
6. inline props

`StartupjsProvider style` is the single app customization surface. It can
contain:

- `:root` token overrides
- `:root.dark` / `:root.<theme>` theme overrides
- `@custom-media`
- component tag overrides
- `Component:part(partName)` overrides
- global utility classes if the optional utility runtime is enabled
- app-specific classes

`UiProvider` is internal to startupjs-ui integration. It may technically remain
usable for standalone startupjs-ui consumption, but docs should center
`StartupjsProvider` for StartupJS apps and `CssxProvider` for standalone CSSX.

### StartupJS UI Theme

StartupJS UI should own a small component-specific theme layer, for example:

```css
:root {
  --Button-height-sm: 2rem;
  --Button-radius: var(--radius-md);
  --User-color-online: var(--color-success);
  --User-color-offline: var(--color-muted-foreground);
}

:root.dark {
  --SomeComponent-shadow: none;
}
```

Rules:

- Prefer shadcn semantic tokens and `--color-*` consumption variables.
- Minimize direct consumption of raw Tailwind palette variables in component
  CSS.
- Use raw palette variables for component defaults only when there is no good
  semantic token.
- Component-specific variables use `--Component-name` / `--Component-name-state`
  style, for example `--User-color-online`.
- Component-specific variables should not pollute the global `--color-*`
  namespace unless utility classes for them are a deliberate public feature.
- Do not keep compatibility aliases for old StartupJS UI token names as the new
  API. This is a breaking migration.

Docs should link to:

- CSSX Tailwind token source
- CSSX shadcn token source
- StartupJS UI component token source

so users have a complete variable reference.

### StartupJS UI Component Style Refactor

Stop using separate component style files in StartupJS UI:

- no component `.cssx.styl`
- no component `.cssx.css`
- no MDX/demo `.cssx.styl` / `.cssx.css`
- keep package-level theme files such as `startupjsUiTheme.cssx.css`

Default placement:

- components rendering with `pug` should place static CSS in `style` blocks
  inside the `pug` template
- components needing JS interpolation should use local `css` template literals
  in the component function
- non-Pug components can use local `css` template literals
- subcomponents should own their own local styles instead of sharing one large
  file

Remove Stylus dependencies from component styles:

- `$UI`
- `merge()`
- `:export config`
- `radius()`
- `shadow()`
- `fontFamily()`
- `bleed()`
- `web()`
- Stylus loops
- `u`

Move values:

- themeable visual values -> CSS variables
- structural constants -> JS constants
- exact JS reads of visual values -> `useCssVariable()` or `useCssColor()`
  only when truly needed

The old `:export config` pattern should disappear. Do not replace it with
another big config object. Customization happens through CSS variables, tag
overrides, part overrides, and per-instance props.

### StartupJS UI Component JS Refactor

Refactor component JS as needed while moving styles:

- replace `colorVariableRequest`, `isColorToken`, and `colorToRGBA` with CSSX
  `useCssColor()` and CSS `color-mix()`
- replace `useMedia` imports with CSSX/startupjs `useMedia`
- replace `u()` usage with `rem`, CSS variables, or the deprecated CSSX `u()`
  only as a migration fallback
- preserve existing public component props unless they are purely artifacts of
  the old style engine
- remove imports and package dependencies on `@startupjs-ui/core` unless they
  are for `UIRole` or another non-style shared type

Visual redesign stance:

- match old components broadly enough that apps do not feel broken
- prefer Tailwind/shadcn token scale over exact old pixel output
- do not preserve old styling quirks that are clearly worse than a simpler
  token-based design
- keep component APIs stable unless there is a strong reason to break them

### Parts And External Styling

`part` is the canonical external styling API:

- `part='root'` maps to `style`
- `part='icon'` maps to `iconStyle`
- `part='text'` maps to `textStyle`
- Babel extracts/threads the props automatically

Refactor rules:

- Prefer `part='root'` on root elements so external root `style` works
  consistently.
- Prefer semantic parts such as `icon`, `text`, `label`, `content`, `loader`,
  `control`, `thumb`, etc. where external styling is useful.
- Do not add `part` to every wrapper.
- If JS needs to read/compose a part style manually, still keep the `part` prop
  on the rendered element and manually pass the composed style.
- If current code manually extracts and forwards `iconStyle` / `textStyle`
  without modifying it, replace that plumbing with the canonical `part`.
- Audit components for missing root style pass-through.

Docs should teach styling in this order:

1. theme variables
2. component tag selectors
3. component `:part()` / `::part()` selectors
4. per-instance `style` / `*Style` props as escape hatches

### `@startupjs-ui/core`

`@startupjs-ui/core` remains only as a small non-style internal/shared package.

Keep:

- `UIRole` type, because React Native types do not cover all web/ARIA roles
  needed by StartupJS UI

Remove or migrate:

- `u` -> CSSX/startupjs deprecated helper
- `useMedia` -> CSSX/startupjs
- `colorToRGBA` -> CSSX `useCssColor()` mix support / CSS `color-mix()`
- color token helpers -> CSSX `useCssColor()`
- any style/theme runtime helper

Public re-export:

- `startupjs-ui` may re-export `UIRole` type for users writing wrappers around
  StartupJS UI components.
- Do not re-export style helpers from `@startupjs-ui/core`.

### Implementation Order

Work package by package, but fully migrate each touched package.

Suggested order:

1. CSSX theme foundation
   - `theme` prop on `CssxProvider`
   - `auto` theme and color-scheme subscriptions
   - `:root.<theme>` variable blocks
   - built-in `@media (--theme-*)`
   - root/theme diagnostics
2. CSSX custom media and breakpoints
   - parse/store `@custom-media`
   - range media evaluator
   - default breakpoint fallbacks
   - CSSX `useMedia()`
3. CSSX theme assets
   - `cssxjs/themes/tailwind`
   - `cssxjs/themes/shadcn`
   - plain `.cssx.css` files
   - compile/sample-resolution tests
4. CSSX JS bridges
   - `useCssColor()`
   - `getCssColor()`
   - deprecated `u()`
   - deprecated CSS `u` diagnostics
5. StartupJS provider wiring
   - `StartupjsProvider theme`
   - preserve `StartupjsProvider style`
   - no default themes in bare StartupJS
6. StartupJS UI provider/theme wiring
   - internal `UiProvider`
   - include Tailwind/shadcn/UI themes
   - forward `StartupjsProvider style` after UI defaults
   - re-export `UIRole` type only
7. StartupJS UI foundational components
   - `Div`
   - `Span`
   - `Icon`
8. StartupJS UI core controls
   - `Button`
   - `Tag`
   - `Badge`
   - text/input primitives
9. StartupJS UI remaining packages
   - layout/navigation/modal/popover
   - forms
   - lists/tables
   - docs/demo components
10. Optional Tailwind utility runtime follow-up
    - only after token/theme/style migration patterns are stable

For every StartupJS UI package migrated:

- inline or localize styles
- remove separate style files/imports
- remove old style helper imports
- audit root and semantic parts
- move visual config to CSS variables
- regenerate package declarations
- update docs/examples
- run targeted lint/type/export checks

### Tests And Validation

CSSX tests:

- Tailwind theme asset compiles in build mode
- shadcn theme asset compiles in build mode
- no `@theme` appears in bundled CSSX theme assets
- root/theme blocks accept only custom properties
- `:root.dark` variables override `:root` only when active theme is `dark`
- `theme='auto'` follows mocked OS color scheme and updates subscribers
- `theme='default'` / `theme='light'` disables dark selection
- custom named themes work
- `@media (--theme-dark)` matches active theme
- `@media (--theme-dark) and (--breakpoint-desktop)` composes correctly
- `@custom-media` aliases expand and resolve variables
- range syntax comparisons are inclusive/exclusive correctly
- `useMedia()` returns fallbacks without provider styles
- `useMedia()` uses provider custom media aliases when present
- `useCssColor()` resolves named tokens, `var(...)`, raw colors, and mixes
- `useCssColor()` subscribes only to variables it resolves
- `getCssColor()` works for global/default variables
- JS `u()` warns once in dev
- CSS `u` unit emits deprecation diagnostics in build mode

StartupJS tests:

- `StartupjsProvider theme` reaches CSSX
- `StartupjsProvider style` still works without startupjs-ui
- bare StartupJS does not include Tailwind/shadcn themes automatically
- startupjs-ui plugin injects UI provider and forwards `theme`/`style`
- app `StartupjsProvider style` overrides UI default theme vars

StartupJS UI tests:

- no component imports style helpers from `@startupjs-ui/core`
- `@startupjs-ui/core` exports/re-exports only approved non-style API
- no component `.cssx.styl` / `.cssx.css` files remain
- no docs/demo `.cssx.styl` / `.cssx.css` files remain
- default UI theme compiles with CSSX
- generated declarations stay correct
- key components preserve root `style` and semantic `*Style` props through
  `part`
- key color props resolve through `useCssColor()`
- dark/default theme snapshots or smoke checks cover high-risk components

General validation:

- `git diff --check`
- CSSX package tests
- StartupJS provider package tests
- StartupJS UI declaration generation
- StartupJS UI export checker
- targeted eslint for migrated packages
- storybook/manual visual checks for foundational components where practical

### Documentation

CSSX docs:

- theme provider API
- `theme='auto'`, explicit themes, and OS color-scheme behavior
- `:root.<theme>` variable blocks
- `@media (--theme-*)`
- theme entrypoints
- `@custom-media`, breakpoint aliases, and range syntax
- `useMedia()`
- `useCssColor()` / `getCssColor()`
- deprecated `u`
- migration notes for `u` units

StartupJS docs:

- `StartupjsProvider style`
- `StartupjsProvider theme`
- bare StartupJS does not include themes unless user imports them
- startupjs-ui plugin behavior when UI is installed

StartupJS UI docs:

- customizing with CSS variables
- links to Tailwind, shadcn, and StartupJS UI theme source files
- component tag overrides
- `:part()` / `::part()` overrides
- per-instance `style` and `*Style` props as escape hatches
- migration from old palette/Colors/CssVariables/useThemeColor/u/Stylus config
- examples should use inline `pug` style blocks or local `css` templates, not
  separate component style files
