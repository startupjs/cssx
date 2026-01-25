# Basic Usage

This guide covers the essentials of CSSX: writing styles and applying them to components.

## Quick Start

```jsx
import { styl } from 'cssxjs'

function Button({ children, primary }) {
  return (
    <button styleName={{ button: true, primary }}>
      {children}
    </button>
  )

  styl`
    .button
      padding 12px 24px
      border-radius 8px
      border none
      cursor pointer

    .button.primary
      background #007bff
      color white
  `
}
```

## Writing Styles

CSSX provides two template literals:

- **`styl`** — [Stylus](https://stylus-lang.com/) syntax (recommended)
- **`css`** — Plain CSS syntax

### styl (Stylus)

Clean, indentation-based syntax without braces or semicolons:

```jsx
styl`
  .card
    padding 16px
    background white
    border-radius 8px
`
```

### css (Plain CSS)

Standard CSS syntax:

```jsx
css`
  .card {
    padding: 16px;
    background: white;
    border-radius: 8px;
  }
`
```

> See [styl Template](/api/styl) and [css Template](/api/css) for full syntax reference.

## Applying Styles with styleName

The `styleName` prop connects elements to CSS classes:

```jsx
// String
<div styleName="card" />

// Object — keys with truthy values are included
<div styleName={{ card: true, active, highlighted }} />

// Array — falsy values are filtered out
<div styleName={['card', active && 'active']} />

// Mixed — combine all syntaxes
<div styleName={['card', variant, { active, disabled }]} />
```

**Tip:** Name variables to match class names for clean shorthand: `{ active }` instead of `{ active: isActive }`.

## Modifier Classes

Use compound selectors for variants:

```jsx
function Card({ highlighted, compact }) {
  return (
    <div styleName={{ card: true, highlighted, compact }}>
      Content
    </div>
  )

  styl`
    .card
      background white
      padding 16px

    .card.highlighted
      border 2px solid gold

    .card.compact
      padding 8px
  `
}
```

## Dynamic Values

For truly dynamic values, combine `styleName` with the `style` prop:

```jsx
function ProgressBar({ progress }) {
  return (
    <div styleName="bar" style={{ width: `${progress}%` }} />
  )

  styl`
    .bar
      height 20px
      background #4caf50
  `
}
```

Or use [CSS Variables](/guide/variables) for runtime theming.

## Style Placement

**Inside a function** — styles are scoped to that component:

```jsx
function Card() {
  return <div styleName="card">...</div>

  styl`
    .card
      background white
  `
}
```

**At module level** — styles are shared across the file:

```jsx
styl`
  .shared-button
    padding 12px 24px
`

function ButtonA() {
  return <button styleName="shared-button">A</button>
}
```

## The `u` Unit

CSSX includes a custom unit where `1u = 8px` (Material Design grid):

```stylus
.card
  padding 2u        // 16px
  margin 1u         // 8px
  gap 0.5u          // 4px
```

## Best Practices

**Use semantic class names:**
```stylus
// Good
.submit-button
.error-message

// Avoid
.blue-box
.margin-16
```

**Keep styles close to components** — place `styl` blocks in the same file.

**Group related properties:**
```stylus
.card
  // Layout
  display flex
  flex-direction column

  // Spacing
  padding 2u
  gap 1u

  // Appearance
  background white
  border-radius 1u
```

## Next Steps

- [Component Parts](/guide/component-parts) — Style child component internals
- [CSS Variables](/guide/variables) — Dynamic theming
- [styl Template API](/api/styl) — Full syntax reference including variables, mixins, selectors
