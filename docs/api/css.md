# css Template

The `css` template literal lets you write styles using plain CSS syntax.

## Basic Usage

```jsx
import { css } from 'cssxjs'

function Button({ children }) {
  return <button styleName="button">{children}</button>

  css`
    .button {
      padding: 12px 24px;
      background: #007bff;
      color: white;
      border-radius: 8px;
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
// Module-level (shared)
css`
  .shared-button {
    padding: 12px 24px;
  }
`

function Card() {
  return <div styleName="card">...</div>

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

### Part Selectors

```css
.button::part(icon) {
  color: red;
}

.button::part(text) {
  font-weight: bold;
}
```

## Limitations

The `css` template does **not** support:

- Stylus variables (`$var`)
- Stylus mixins
- Global `styles/index.styl` imports

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
| Part selectors | Yes | Yes |

## See Also

- [styl Template](/api/styl) — Stylus syntax with variables and mixins
- [styleName Prop](/api/jsx-props) — Connect elements to styles
