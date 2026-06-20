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
  useCompiledCss,
  useCssxSheet,
  useCssxTemplate,
  CssxProvider,
  configureCssx
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
| `variables` | Observable object | Set CSS variable values at runtime |
| `setDefaultVariables` | Function | Set default CSS variable values |
| `defaultVariables` | Object | Read-only default variable values |
| `cssx` | Function | Resolve a runtime sheet and `styleName` to props |
| `useCompiledCss` | Hook | Compile runtime CSS text into a tracked sheet |
| `useCssxSheet` | Hook | Track an already compiled sheet |
| `useCssxTemplate` | Hook | Track a compiled sheet with interpolation values |
| `CssxProvider` | Component | Provide runtime options to a subtree |
| `configureCssx` | Function | Configure global runtime defaults |
