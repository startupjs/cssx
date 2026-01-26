# Basic Usage

This guide covers the essentials of CSSX: writing styles and applying them to components.

## Quick Start

```jsx
import { styl } from 'cssxjs'

function Button({ children, variant, disabled }) {
  return (
    <button styleName={['button', variant, { disabled }]}>
      {children}
    </button>
  )

  styl`
    .button
      padding 12px 24px
      border-radius 8px
      border none
      cursor pointer

      &.primary
        background #007bff
        color white

      &.disabled
        opacity 0.5
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

The `styleName` prop connects elements to CSS classes. For simple cases, use a string:

```jsx
<div styleName="card" />
```

### The Recommended Pattern

For dynamic styling, use the **array pattern** — it's the cleanest and most maintainable approach:

```jsx
<div styleName={['card', variant, { highlighted, compact }]} />
```

This pattern has three parts, in order:

1. **Base class** — the main class name (`'card'`)
2. **Variant variables** — string variables that map to class names (`variant`)
3. **Boolean modifiers** — an object where keys become classes when values are truthy (`{ highlighted, compact }`)

**Example breakdown:**

```jsx
function Card({ variant = 'default', highlighted, compact }) {
  // If variant='featured', highlighted=true, compact=false
  // Results in: class="card featured highlighted"
  return (
    <div styleName={['card', variant, { highlighted, compact }]}>
      Content
    </div>
  )

  styl`
    .card
      background white
      padding 16px

      &.featured
        border 2px solid gold

      &.highlighted
        box-shadow 0 0 10px gold

      &.compact
        padding 8px
  `
}
```

**Why this pattern works:**

- **Readable** — clear separation between base, variants, and modifiers
- **Clean** — no verbose `{ card: true, [variant]: true }` syntax
- **Flexible** — add as many variants or modifiers as needed
- **Maintainable** — easy to see what classes are applied

**Tip:** Name your variables to match class names for clean shorthand: use `{ active }` instead of `{ active: isActive }`. This makes the code self-documenting.

## Modifier Classes

Use the `&` parent selector for variants:

```jsx
function Card({ variant, highlighted, compact }) {
  return (
    <div styleName={['card', variant, { highlighted, compact }]}>
      Content
    </div>
  )

  styl`
    .card
      background white
      padding 16px

      &.featured
        border 2px solid gold

      &.highlighted
        box-shadow 0 0 10px gold

      &.compact
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

## CSS Support

CSSX runs on React Native, so not all CSS features are available.

### Supported

| Feature | Example | Notes |
|---------|---------|-------|
| Class selectors | `.card`, `.button` | |
| Compound selectors | `.card.featured` | Same element |
| Parent reference `&` | `&.active`, `&.disabled` | `styl` only |
| Part selectors | `::part(icon)`, `:part(text)` | |
| CSS variables | `var(--color)`, `var(--size, 16px)` | |
| Animations | `animation fadeIn 0.3s ease` | Reanimated v4 components only |
| Keyframes | `@keyframes fadeIn` | Reanimated v4 components only |
| Transitions | `transition background 0.2s` | Reanimated v4 components only |
| Media queries | `@media (min-width: 768px)` | |
| Most CSS properties | `padding`, `margin`, `flex`, `color`, etc. | |
| Custom `u` unit | `padding 2u` | 1u = 8px |

> **Note:** Animations and transitions require [Reanimated v4](https://docs.swmansion.com/react-native-reanimated/) components (`Animated.View`, `Animated.Text`, etc.). See [Animations guide](/guide/animations) for details.

### Not Supported

| Feature | Alternative |
|---------|-------------|
| `:hover` | Use `onPressIn`/`onPressOut` with `&.pressed` modifier |
| `:focus` | Use `onFocus`/`onBlur` with `&.focused` modifier |
| `:active` | Use state with `&.active` modifier |
| `::before`, `::after` | Use a real element with its own styles |
| Descendant selectors | `.parent .child` — add modifier to child directly |
| Attribute selectors | `[type="text"]` — use class modifiers instead |
| `:first-child`, `:nth-child` | Handle in JS when rendering |

### Example: Replacing :hover

Instead of `:hover`, track state and use a modifier:

```jsx
function Button({ children, onPress }) {
  const [pressed, setPressed] = useState(false)

  return (
    <Pressable
      styleName={['button', { pressed }]}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={onPress}
    >
      {children}
    </Pressable>
  )

  styl`
    .button
      background #007bff

      &.pressed
        background #0056b3
  `
}
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
