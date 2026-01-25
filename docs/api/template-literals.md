# Template Literals

CSSX provides template literals for writing styles and markup.

## styl

A tagged template literal for writing styles using Stylus syntax.

```jsx
styl`
  .button
    padding 12px 24px
    background blue
    color white
`
```

**Syntax Rules:**
- Uses Stylus syntax (indentation-based, no semicolons or braces needed)
- Colons between property and value are optional
- Placed inside a function: applies to that component only (local styles)
- Placed at module level: applies to all components in the file (global styles)

**Limitations:**
- No expression interpolations (`` styl`color ${color}` `` is not allowed)
- Must be a plain template literal

**Example:**

```jsx
import { styl } from 'cssxjs'

// Global styles (module level)
styl`
  .container
    max-width 1200px
    margin 0 auto
`

function Card({ children }) {
  // Local styles (function level)
  return <div styleName="card">{children}</div>

  styl`
    .card
      background white
      border-radius 8px
      padding 16px
  `
}
```

---

## css

A tagged template literal for writing styles using plain CSS syntax.

```jsx
css`
  .button {
    padding: 12px 24px;
    background: blue;
    color: white;
  }
`
```

Works identically to `styl` but uses standard CSS syntax instead of Stylus. Use this if you prefer traditional CSS or are migrating from another CSS-in-JS solution.

> **Note:** The `css` template does not support Stylus features like variables (`$var`), mixins, or the global `styles/index.styl` imports. For those features, use `styl`.

---

## pug

A tagged template literal for writing JSX using Pug syntax.

```jsx
import { pug, styl } from 'cssxjs'

function Card({ title, children }) {
  return pug`
    div.card
      h2.title= title
      div.content
        = children
  `

  styl`
    .card
      background white
    .title
      margin 0
  `
}
```

See the [Pug Templates guide](/guide/pug) for complete syntax documentation.

---

## The `u` Unit

CSSX supports the `u` unit where `1u = 8px`, following Material Design's 8px grid system.

```stylus
.card
  padding 2u        // 16px
  margin 1u 2u      // 8px 16px
  border-radius 1u  // 8px
  gap 0.5u          // 4px
```

Works in any numeric property:

```stylus
.element
  width 10u                    // 80px
  height 5u                    // 40px
  font-size 1.75u              // 14px
  box-shadow 0 0.5u 1u #000    // 0 4px 8px #000
```

---

## CSS Features

### Media Queries

Use standard `@media` syntax:

```stylus
.container
  padding 16px

  @media (max-width: 768px)
    padding 8px
```

Media queries respond to screen size changes automatically.

### Viewport Units

Use `vw` and `vh` units:

```stylus
.hero
  height 100vh
  width 100vw
```

### CSS Variables

Use `var()` with optional fallback:

```stylus
.button
  background var(--primary-color, #007bff)
  color var(--text-color, white)
```

---

## Selectors

### Supported

- `.class` - Class selector
- `.class1.class2` - Multiple classes (AND)
- `.parent .child` - Descendant (same element only)
- `&.modifier` - Modifier class (Stylus syntax)
- `::part(name)` - Part selector

### Part Selector

Target internal parts of child components:

```stylus
.button::part(icon)
  color red

.button::part(text)
  font-weight bold
```

Equivalent shorthand (single colon):

```stylus
.button:part(icon)
  color red
```
