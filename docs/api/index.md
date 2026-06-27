# API Reference

This section documents all exports from the `cssxjs` package.

## Imports

```jsx
import {
  styl,
  css,
  pug,
  variables,
  setDefaultVariables,
  defaultVariables,
  cssx,
  useRuntimeCss,
  useCssVariable,
  useCssVariableRaw,
  useCssxSheet,
  useCssxTemplate,
  CssxProvider,
  configureCssx,
  themed
} from 'cssxjs'
```

## Sections

**Templates:**
- [styl Template](/api/styl) — Stylus syntax, variables, mixins, `u` unit
- [css Template](/api/css) — Plain CSS syntax
- [pug Template](/api/pug) — JSX alternative with Pug syntax, TypeScript expressions, and embedded style blocks

**Styling:**
- [styl() Function](/api/styl-function) — Apply styles via spread
- [JSX Props](/api/jsx-props) — `styleName`, `part`
- [Theming](/guide/theming) — Provider style layers, themes, component tags, and theme assets
- [CSS Variables](/api/variables) — Runtime theming
- [Runtime Compilation](/api/runtime) — Compile generated CSS strings at runtime
- [Caching](/guide/caching) — Built-in resolver cache behavior

**Configuration:**
- [Babel Config](/api/babel) — Preset options
- [TypeScript Support](/guide/typescript) — Pug-aware type checking with `cssxjs check`

## Quick Reference

| Export | Type | Description |
|--------|------|-------------|
| `styl` | Template literal / Function | Write styles in Stylus syntax, or apply styles via spread |
| `css` | Template literal | Write styles in plain CSS syntax |
| `pug` | Template literal | Write JSX in Pug syntax, with TypeScript expressions and embedded `style` blocks |
| `variables` | Reactive object | Set CSS variable values at runtime; supports `.assign()`, `.set()`, `.clear()` |
| `setDefaultVariables` | Function | Replace default CSS variable values |
| `defaultVariables` | Reactive object | Default variable values; supports `.assign()`, `.set()`, `.clear()` |
| `cssx` | Function | Resolve a runtime sheet and `styleName` to props |
| `useRuntimeCss` | Hook | Compile runtime CSS text into a tracked sheet |
| `useCssVariable` | Hook | Read a CSS variable as an RN-friendly value and subscribe to it |
| `useCssVariableRaw` | Hook | Read a CSS variable as raw resolved CSS text |
| `useCssxSheet` | Hook | Track an already compiled sheet |
| `useCssxTemplate` | Hook | Track a compiled sheet with interpolation values |
| `CssxProvider` | Component | Provide runtime options and global/scoped CSS to a subtree |
| `themed` | Function | Give a component a CSS tag for provider/global component overrides |
| `configureCssx` | Function | Configure global runtime defaults |
