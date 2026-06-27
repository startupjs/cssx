# CSSX Architecture

CSSX is a CSS authoring, compilation, and runtime system for React Native and
web React. It exists so users can write normal-looking CSS near components while
React receives stable, platform-correct style props.

The important current design decision is that the CSS-to-React-Native pipeline
is unified in `@cssxjs/css-to-rn`. Older responsibilities that used to be split
across forked `css-to-react-native`, `css-to-react-native-transform`, and
`@cssxjs/runtime` now live in this package.

## Public Model

Users normally import from `cssxjs`:

- `css` and `styl` tagged templates for local component styles.
- `styleName` on JSX or Pug elements for class-style matching.
- `part` on JSX or Pug elements for externally styleable component slots.
- `CssxProvider` for global/provider styles, CSS variables, custom media, and
  theme selection.
- `themed()` for components that should receive provider/global tag selectors
  such as `Button` and `Button:part(text)`.
- `useRuntimeCss()` and `cssx()` for dynamic client-side CSS compilation.
- `variables`, `defaultVariables`, `useCssVariable()`, `useCssColor()`,
  `getCssVariable()`, `getCssVariableRaw()`, `getCssColor()`, `useMedia()`,
  and `u()` for CSS-to-JS bridges and migration helpers.
- `configureCssx()`, `setDefaultVariables()`, `useCssxSheet()`,
  `useCssxTemplate()`, `useCssxConfig()`, and `useCssxRuntimeContext()` for
  lower-level integration code.
- `matcher` for legacy compatibility only. New code should use CSSX runtime
  APIs directly.
- Theme entrypoints such as `cssxjs/themes/tailwind` and
  `cssxjs/themes/shadcn`.

StartupJS re-exports this API and StartupJS UI uses it for its default theme and
component customization model, but CSSX is usable without either project.

## Package Ownership

### `packages/css-to-rn`

The compiler/runtime engine. It owns:

- CSS parsing through the lightweight `css` parser.
- CSS sheet IR and diagnostics.
- Selectors, cascade order, parts, pseudo states, media rules, custom media, and
  component tag selectors.
- `:root` variables and `:root.<theme>` provider theme variables.
- CSS variable fallback and nested `var()` resolution.
- Runtime template interpolation values.
- CSS value functions needed by React Native, including `calc()`, `oklch()`, and
  `color-mix()`.
- Unit conversion, including `u`, `rem`, viewport units, and React Native
  numeric coercion.
- Property transforms such as shorthands, `box-shadow`, `filter`, animations,
  transitions, and platform-specific background image output.
- Runtime matching and cache identity.
- React hooks, provider context, theme preference, dimensions/media
  subscriptions, and memory-safe dependency tracking.

### `packages/cssxjs`

The public facade. It exports the stable `cssxjs` API, platform runtime
wrappers, Babel preset wrapper, loader wrappers, Metro wrappers, CLI helpers,
and built-in theme strings. Its runtime files preserve the historical generated
Babel call shape and delegate actual work to `@cssxjs/css-to-rn`.

### Babel Packages

- `packages/babel-plugin-rn-stylename-inline` compiles inline `css` and `styl`
  templates. It lowers JavaScript interpolation to synthetic CSS variables and
  emits local sheet registrations.
- `packages/babel-plugin-rn-stylename-to-style` rewrites `styleName`, `part`,
  legacy `*StyleName`, imported style files, and helper calls into runtime
  calls.
- `packages/babel-preset-cssxjs` defines transform ordering.

### Loader And Bundler Packages

- `packages/loaders` contains direct loader entrypoints. Stylus preprocessing
  stays separate, then compiled CSS goes through `@cssxjs/css-to-rn`.
- `packages/bundler` contains Metro hot-reload handling for separate style
  files. StartupJS can choose whether CSSX imports are compiled in Babel or
  handled by Metro.

### Docs, Example, ESLint

- `docs/` is the public documentation source of truth.
- `example/` is the web demo.
- `packages/eslint-plugin-cssxjs` wraps the React Pug processor for CSSX usage.

## Compiled Sheet IR

The compiler produces JSON-serializable sheets:

- `rules`: selector and declaration IR.
- `keyframes`: animation keyframe objects.
- `rootVariables`: declarations from `:root`.
- `themeVariables`: declarations from `:root.<theme>`.
- `customMedia`: declarations from `@custom-media`.
- `exports`: any exported CSS values.
- `metadata`: booleans and dependency lists for vars, media, themes,
  animations, transitions, interpolations, and runtime dependencies.
- `diagnostics`: non-fatal warnings plus fatal compile errors for build mode.

Runtime-only objects, caches, render trackers, and subscription state must never
be stored on the sheet itself. This keeps compiled sheets serializable and safe
to pass through Babel output, imports, and provider style arrays.

## Build-Time Flow

### Inline Templates

Inline templates are the recommended authoring style:

```jsx
function Button ({ color, children }) {
  return <View styleName='root'><Text part='text'>{children}</Text></View>

  css`
    .root {
      background-color: ${color};
    }
  `
}
```

The inline plugin:

1. Finds `css` and `styl` tagged templates.
2. Compiles Stylus to CSS when needed.
3. Compiles CSS to sheet IR.
4. Replaces interpolations with `var(--__cssx_dynamic_N)` slots.
5. Emits a runtime layer with the compiled sheet and the current interpolation
   values.

The plugin only performs the historical "move unreachable style block above
return" behavior for final expression templates placed after all returns. When
templates are placed elsewhere, their lexical position is respected so local
variables and hooks stay valid.

### JSX And Pug Style Rewrites

The styleName plugin:

1. Finds JSX/Pug elements with `styleName`, `part`, old `*StyleName`, or style
   helper calls.
2. Rewrites them to runtime calls that resolve classes and parts.
3. Injects `useCssxLayer()` once per relevant component for compiled local or
   imported sheets that need React subscriptions.
4. Rewrites `part='root'` to `style`; other parts become `{partName}Style`.
5. Preserves manually extracted part props when the component author needs to
   inspect or merge them in JS.

Generated runtime calls keep the compatibility signature:

```js
runtime(styleName, fileStyles, globalStyles, localStyles, inlineStyleProps)
```

The wrappers in `cssxjs/runtime/web.js` and
`cssxjs/runtime/react-native.js` translate that shape into calls owned by
`@cssxjs/css-to-rn`.

### Separate Style Files

Separate `.cssx.css`, `.cssx.styl`, and legacy `.styl` files are still
supported. Babel can compile imports directly with `compileCssImports`; Metro
can also transform configured extensions for hot reloading. StartupJS defaults
to compiling `.cssx.css` in Babel so Expo can keep handling ordinary `.css`, and
keeps Stylus in Metro by default because Expo does not own `.styl`.

Inline templates are preferred for new component code because they keep styles
near the component and avoid large shared style files.

## Selector Model

CSSX supports the selectors needed by React Native component styling:

- Class selectors: `.root`, `.button.primary`.
- Compound class selectors.
- Component tag selectors: `Button`, `Button:part(text)`.
- `:part(name)` and `::part(name)` for external parts.
- `:hover` and `:active`, which map to `hoverStyle` and `activeStyle`.
- `@media` wrappers, including custom media and theme media aliases.
- Provider-only `:root` and `:root.<theme>` variables.

Descendant and arbitrary DOM selectors are intentionally outside the core
React Native model. Cross-component customization should use `themed()` plus
component tag selectors, not DOM ancestry.

## Parts And Component Tags

`part` is the public customization contract for component internals.

- `part='root'` exposes the root `style` prop.
- `part='icon'` exposes `iconStyle`.
- `part='text'` exposes `textStyle`.

The Babel plugin automatically extracts these props from component parameters
when needed. If an author already destructures `iconStyle`, the plugin does not
add a duplicate extraction.

Component tag selectors are only active when a component opts in:

```js
export default observer(themed('Button', function Button () {
  return pug`
    Div.root(part='root')
      Span(part='text') Save
  `
}))
```

Provider/global CSS can then target:

```css
Button {
  --Button-background-color: var(--color-primary);
}

Button:part(text) {
  font-weight: 600;
}
```

Inside a component's own CSS, `:part(text)` means "style this component's
exposed text part". It does not select arbitrary child components by DOM
ancestry.

## Variables And Value Resolution

CSSX attempts to model browser `var()` behavior closely:

- Nested `var()` is supported.
- Fallbacks are supported.
- Variables can represent a whole value, one item in a comma-separated list, or
  part of a complex value such as `box-shadow`.
- Interpolation values are implemented as synthetic variables and participate
  in the same resolver.
- The resolver tracks exactly which variables and media inputs were used so
  React re-renders only when relevant dependencies change.

Variable priority is:

1. Inline/runtime values passed with a layer.
2. Imperative runtime `variables`.
3. Provider `:root` and active `:root.<theme>` scopes, nearest provider last.
4. `defaultVariables`.
5. CSS fallback values.

`variables` and `defaultVariables` are proxies. Valid variable keys must start
with `--`; invalid keys throw. Use `.assign()` for merge updates, `.set()` for
replace-all updates, and `.clear()` to remove all keys.

## CSS Values And Property Transforms

CSSX transforms CSS values into React Native-friendly style props:

- Standard kebab-case properties become camelCase unless they need a platform
  exception.
- `background-image` becomes `experimental_backgroundImage` on React Native and
  `backgroundImage` on web.
- `background` may produce `backgroundColor` and/or
  `experimental_backgroundImage`.
- `background-image` keeps only `linear-gradient()` and `radial-gradient()`
  strings because those are the React Native-supported image forms.
- `filter` resolves variables and is passed through for modern React Native/web
  targets.
- `box-shadow` supports complex shadow lists and variable substitution, then is
  passed through as a `boxShadow` string for modern React Native/web targets.
- `animation` and `transition` compile to the style shapes expected by
  Reanimated v4. Keyframes are static sheet data, while variables/interpolation
  inside values resolve at runtime where supported by the value resolver.
- `line-height` accepts unitless raw numbers so UI text components can convert
  relative values to React Native pixel values when needed.
- `u` is still supported for migration and is equivalent to `0.5rem`, but new
  code should prefer `rem` or design tokens.

Color functions are evaluated with a lightweight color stack. CSSX supports the
CSS color operations needed by the StartupJS UI theme, especially `oklch()` and
`color-mix()`.

## Provider Styles, Themes, And Custom Media

`CssxProvider` accepts `style` as a string, compiled sheet, tracked sheet, layer
object, or array of those values. Provider styles are where global variables,
theme variables, custom media, component tag overrides, and utility classes
live.

Theme variables are declared with root selectors:

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

Rules can be scoped to active themes with reserved custom media aliases:

```css
@media (--theme-dark) {
  .card {
    border-width: 1px;
    box-shadow: none;
  }
}
```

Provider `theme` values:

- `default`: use `:root` variables.
- `light`: use `:root.light` when present, otherwise `:root`.
- any other string: use the matching `:root.<theme>`.
- `auto`: use `dark` only when the platform color scheme is dark and a `dark`
  theme exists; otherwise use `default`.

At the root, omitting `theme` uses the persisted global preference. Without a
saved preference, the root provider starts in `default` so host UI such as React
Navigation does not unexpectedly switch to dark mode. Root `theme='auto'` uses
the system color scheme as the initial preference, then a saved or
user-selected preference takes priority. A non-root or explicit non-`auto`
provider `theme` forces that subtree. `useTheme()` returns `[theme, setTheme]`.
Web persists preference in `localStorage`; the React Native entrypoint imports
`@react-native-async-storage/async-storage` for persistence, so React Native
apps using theme persistence must install that optional peer.

`@custom-media` declarations are collected from provider styles and component
styles. They can reference CSS variables and other custom media, with cycle
diagnostics. CSSX ships default breakpoint names used by StartupJS UI, such as
`--breakpoint-tablet`, and lets provider styles override or extend them.

## Built-In Themes

`cssxjs/themes/tailwind` exports Tailwind-compatible base design tokens as a
plain CSS string. Tailwind's non-standard `@theme` syntax is not shipped.

`cssxjs/themes/shadcn` exports shadcn-compatible semantic variables as a plain
CSS string with default and dark theme roots. It follows the shadcn pattern of
declaring semantic values such as `--primary` and mapping them to Tailwind-like
`--color-primary` variables for use by components and future utility support.

These exports are just CSSX provider style inputs. They do not enable a
Tailwind utility runtime by themselves.

## Runtime APIs

### Static Compiled Components

Most application code goes through Babel. Runtime receives compiled sheets and
resolves style props by class name, parts, active theme, dimensions, variables,
and inline styles. Cache slots preserve object identity when inputs do not
change, which prevents unnecessary React child updates.

### Runtime Compilation

`useRuntimeCss(rawCss)` compiles raw CSS on the client and returns a tracked
sheet. This exists for cases such as AI-generated CSS:

```jsx
const sheet = useRuntimeCss(generatedCss)
return <Div {...cssx(['root', { disabled }], sheet, { backgroundColor: 'red' })} />
```

The third `cssx()` argument is inline style props. Variables come from
`variables`, `defaultVariables`, provider `:root` scopes, or layer/template
`values`. Runtime compile errors degrade gracefully through diagnostics instead
of throwing by default, because user-generated CSS can be invalid. Build-time
compilation should remain stricter.

### Dependency Tracking

React tracking is based on `useSyncExternalStore`. During render, CSSX records
which variables, media queries, dimensions, theme values, and interpolation
slots were actually used. On commit, the render dependencies replace the
previous dependencies. If a render suspends and never commits, the previous
committed dependencies remain active, which avoids leaking transient
subscriptions.

Only changes to used dependencies trigger subscribers. For example, changing
`--text` re-renders components that used `--text`; changing unrelated variables
does not.

### Caching

Runtime caches resolved style output per call site and input signature:

- sheet identity/hash
- `styleName`
- active provider layers
- active theme
- dimensions/media snapshot
- interpolation values
- inline style value hash
- used variable versions

Inline style objects are hashed with `JSON.stringify()` by value so ordinary
inline object literals remain ergonomic. The cache keeps the current entry for a
slot instead of growing unbounded with old value combinations.

## Platform Entrypoints

`@cssxjs/css-to-rn` and `cssxjs` expose web and React Native entrypoints. React
Native entrypoints install platform adapters for dimensions, color scheme, and
optional async theme persistence. Web entrypoints install browser adapters for
window dimensions, color scheme, and `localStorage`.

The package targets modern Node and React 19. React context is read with
React's `use()` where the runtime benefits from conditional/contextual reads.

## Diagnostics

The compiler emits diagnostics for ignored selectors, unsupported values,
invalid variable names, custom media cycles, invalid runtime CSS, and target
limitations. Runtime compilation returns sheets with diagnostics rather than
crashing normal UI flows. Build-time callers can choose stricter behavior.

Source identifiers used in public bundles must not leak absolute server paths.
Babel-generated cache/source IDs should be stable hashes or safe relative
identifiers. Build errors may still show real paths to help developers debug.

## StartupJS Integration

StartupJS uses `startupjs/babel` to run Pug, CSSX, plugin auto-loading,
Teamplay, eliminator, debug, i18n, and tree-shaking transforms in one preset.
StartupJS `StartupjsProvider` forwards `style` and `theme` to `CssxProvider`.
StartupJS UI injects its own `UiProvider` through StartupJS's plugin system and
layers the Tailwind, shadcn, and StartupJS UI theme strings into CSSX.

CSSX should not depend on StartupJS or StartupJS UI. Integration-specific
behavior belongs in those repos unless it is a general CSSX primitive.

## Testing Strategy

Use the smallest relevant test surface:

- `packages/css-to-rn/test/engine/**`: parser, selectors, variables, values,
  properties, themes, custom media, runtime compile diagnostics, cache logic.
- `packages/css-to-rn/test/react/**`: provider behavior, hooks,
  subscriptions, memory-leak edge cases, theme persistence, dimensions.
- `packages/css-to-rn` type tests: public TypeScript surface and node
  strip-only TypeScript compatibility.
- `packages/babel-plugin-rn-stylename-inline`: inline templates,
  interpolation, template placement, snapshots.
- `packages/babel-plugin-rn-stylename-to-style`: `styleName`, `part`, imported
  sheets, helper hook injection, snapshots.
- `packages/loaders`: CSS/Stylus loader wrappers.
- `packages/cssxjs/test`: public facade smoke tests and theme export tests.
- `docs/` and `example/`: public behavior and integration smoke checks.

When changing cache or subscription logic, test object identity, invalidation,
multiple components/elements, interrupted/suspended renders, and no-leak
cleanup behavior.

## Maintenance Rules

- Keep compiler IR serializable.
- Keep runtime compilation lightweight enough for client-side use.
- Prefer CSS standards over custom syntax.
- Do not reintroduce a hard dependency on Teamplay for CSS invalidation.
- Keep built-in themes as plain CSS strings through JS entrypoints.
- Keep StartupJS UI-specific tokens in StartupJS UI unless they are generic
  enough for CSSX itself.
- Update `AGENTS.md`, this file, and public docs whenever public behavior or
  package boundaries change.
