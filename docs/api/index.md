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

- [Template Literals](/api/template-literals) - `styl`, `css`, `pug`
- [CSS Variables](/api/variables) - `variables`, `setDefaultVariables`, `defaultVariables`, `dimensions`
- [JSX Props](/api/jsx-props) - `styleName`, `part`
- [Babel Configuration](/api/babel) - Preset options and setup

## Quick Reference

| Export | Type | Description |
|--------|------|-------------|
| `styl` | Template literal | Write styles in Stylus syntax |
| `css` | Template literal | Write styles in plain CSS syntax |
| `pug` | Template literal | Write JSX in Pug syntax |
| `variables` | Observable object | Set CSS variable values at runtime |
| `setDefaultVariables` | Function | Set default CSS variable values |
| `defaultVariables` | Object | Read-only default variable values |
| `dimensions` | Observable object | Current screen width for media queries |
| `matcher` | Function | Internal style matching (advanced) |
