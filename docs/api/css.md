# css Template

The `css` template literal lets you write styles using plain CSS syntax.

## Basic Usage

```jsx
import { css } from 'cssxjs'
import { Pressable, Text } from 'react-native'

function Button({ children }) {
  return (
    <Pressable styleName="button">
      <Text styleName="text">{children}</Text>
    </Pressable>
  )

  css`
    .button {
      padding: 12px 24px;
      background: #007bff;
      border-radius: 8px;
    }
    .text {
      color: white;
    }
  `
}
```

## When to Use

Use `css` instead of `styl` when you:
- Prefer standard CSS syntax
- Are migrating from another CSS-in-JS solution
- Want to copy/paste CSS from other sources
- Don't need Stylus features like variables or mixins

## Placement

Works the same as `styl` — inside a function for component-scoped styles, or at module level for shared styles:

```jsx
import { View } from 'react-native'

// Module-level (shared)
css`
  .shared-button {
    padding: 12px 24px;
  }
`

function Card() {
  return <View styleName="card">...</View>

  // Function-level (scoped)
  css`
    .card {
      background: white;
      border-radius: 8px;
    }
  `
}
```

## Syntax

Standard CSS with all familiar features:

```css
.button {
  padding: 12px 24px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 8px;
}

.button.primary {
  background-color: #0056b3;
}

.button.disabled {
  opacity: 0.5;
}
```

## The `u` Unit

The custom `u` unit works in `css` too:

```css
.card {
  padding: 2u;        /* 16px */
  margin: 1u;         /* 8px */
  border-radius: 1u;  /* 8px */
}
```

## Supported Features

### Media Queries

```css
.container {
  padding: 16px;
}

@media (max-width: 768px) {
  .container {
    padding: 8px;
  }
}
```

### CSS Variables

```css
.button {
  background: var(--primary-color, #007bff);
  color: var(--text-color, white);
}
```

Variables can appear anywhere CSS allows `var()`: whole values, parts of
shorthands, comma-separated value chunks, and nested fallbacks.

```css
.card {
  box-shadow: var(--shadow, 0 4px 12px rgba(0, 0, 0, 0.16));
  border: var(--border-width, 1px) solid var(--border-color, #ddd);
}
```

Provider/global CSS can define subtree-scoped variables with `:root`:

```css
:root {
  --primary-color: oklch(62% 0.18 250);
}
```

Those variables are scoped by `CssxProvider`, not stored as global defaults.

### Modern Color Functions

CSSX resolves `oklch()`, `oklab()`, and `color-mix()` to legacy `rgba(...)`
strings so the same CSS works on React Native:

```css
.button {
  background-color: color-mix(in oklch, var(--brand), white 20%);
}
```

### JavaScript Interpolation

Function-scoped `css` templates support JavaScript interpolation in CSS value
positions:

```jsx
function Badge({ color, size }) {
  return <View styleName="badge" />

  css`
    .badge {
      background-color: ${color};
      padding: ${size}px 12px;
    }
  `
}
```

Interpolation is an alternative to `var()`. It is only supported in the same
places a CSS value can use `var()`, and only inside function-scoped JS tagged
templates. Module-level templates, imported CSS files, and runtime CSS strings
must use plain CSS text.

### Part Selectors

```css
.button:part(icon) {
  color: red;
}

.button::part(text) {
  font-weight: bold;
}
```

Both `:part()` and `::part()` are supported.

### Component Tag Selectors

Provider/global CSS can target components wrapped with `themed()` by tag:

```css
Button {
  background: var(--button-bg);
}

Button.primary:part(text) {
  color: white;
}
```

Tag selectors are intended for global component overrides. Class selectors still
work as utility classes everywhere.

### Hover and Active Styles

CSSX maps `:hover` and `:active` to the same output as `:part(hover)` and
`:part(active)`. Components can receive those props as `hoverStyle` and
`activeStyle`.

```css
.button:hover {
  background-color: #0056b3;
}

.button:active {
  transform: scale(0.97);
}
```

### Filters and Background Images

React Native supports `filter` and experimental background gradients in current
versions. CSSX passes `filter` through and maps `background-image` to
`experimental_backgroundImage` on React Native.

```css
.hero {
  filter: blur(8px) brightness(0.8);
  background-image:
    linear-gradient(0deg, white, rgba(238, 64, 53, 0.8), rgba(238, 64, 53, 0) 70%),
    radial-gradient(circle, rgba(0, 0, 0, 0.2), transparent 70%);
}
```

Only `linear-gradient()` and `radial-gradient()` background images are emitted
for React Native. Other image values are ignored with a diagnostic.

### Runtime CSS Strings

For CSS text that is generated at runtime, use the
[Runtime Compilation API](/api/runtime). Runtime strings must be plain CSS text
and use `var()` for dynamic values.

## Limitations

The `css` template does **not** support:

- Stylus variables (`$var`)
- Stylus mixins
- Global `styles/index.styl` imports
- JavaScript interpolation in module-level templates or runtime CSS strings

For these features, use the [styl template](/api/styl) instead.

## Comparison

| Feature | `styl` | `css` |
|---------|--------|-------|
| Syntax | Stylus (optional braces/semicolons) | Standard CSS |
| Variables | `$primary = #007bff` | Not supported |
| Mixins | `flex-center()` | Not supported |
| Global imports | `styles/index.styl` | Not supported |
| `u` unit | Yes | Yes |
| CSS variables | Yes | Yes |
| Function-scoped JS interpolation | Yes | Yes |
| Part selectors | Yes | Yes |
| Runtime CSS strings | No | [Runtime API](/api/runtime) |

## See Also

- [styl Template](/api/styl) — Stylus syntax with variables and mixins
- [styleName Prop](/api/jsx-props) — Connect elements to styles
- [Runtime Compilation](/api/runtime) — Compile generated CSS strings
