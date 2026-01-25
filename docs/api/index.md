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
  dimensions,
  matcher
} from 'cssxjs'
```

## Sections

**Templates:**
- [styl Template](/api/styl) — Stylus syntax, variables, mixins, `u` unit
- [css Template](/api/css) — Plain CSS syntax
- [pug Template](/api/pug) — JSX alternative with Pug syntax

**Styling:**
- [styl() Function](/api/styl-function) — Apply styles via spread
- [JSX Props](/api/jsx-props) — `styleName`, `part`
- [CSS Variables](/api/variables) — Runtime theming

**Configuration:**
- [Babel Config](/api/babel) — Preset options

## Quick Reference

| Export | Type | Description |
|--------|------|-------------|
| `styl` | Template literal / Function | Write styles in Stylus syntax, or apply styles via spread |
| `css` | Template literal | Write styles in plain CSS syntax |
| `pug` | Template literal | Write JSX in Pug syntax |
| `variables` | Observable object | Set CSS variable values at runtime |
| `setDefaultVariables` | Function | Set default CSS variable values |
| `defaultVariables` | Object | Read-only default variable values |
| `dimensions` | Observable object | Current screen width for media queries |
| `matcher` | Function | Internal style matching (advanced) |
