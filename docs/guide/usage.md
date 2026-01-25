# Basic Usage

This guide covers the core concepts of CSSX: writing styles with `styl` or `css`, applying them with `styleName`, and using Stylus or CSS syntax.

## The `styl` and `css` Template Literals

CSSX provides two template literals for writing styles:

- **`styl`** - Write styles using [Stylus](https://stylus-lang.com/) syntax (recommended)
- **`css`** - Write styles using plain CSS syntax

### Stylus Syntax (styl)

The `styl` template literal uses Stylus, which allows a cleaner, indentation-based syntax:

```jsx
import { styl } from 'cssxjs'

function MyComponent() {
  return <div styleName="box">Hello</div>

  styl`
    .box
      padding 16px
      background-color #f0f0f0
      border-radius 8px
  `
}
```

### Placement

The `styl` block can be placed anywhere in your component function. A common convention is to place it after the return statement:

```jsx
function Component() {
  return <div styleName="root">...</div>

  styl`
    .root
      /* styles */
  `
}
```

Or at the module level for shared styles:

```jsx
import { styl } from 'cssxjs'

// Module-level styles (available to all components in this file)
styl`
  .shared-button
    padding 12px 24px
`

function ButtonA() {
  return <button styleName="shared-button">A</button>
}

function ButtonB() {
  return <button styleName="shared-button">B</button>
}
```

### Plain CSS Syntax (css)

If you prefer standard CSS syntax, use the `css` template literal:

```jsx
import { css } from 'cssxjs'

function MyComponent() {
  return <div styleName="box">Hello</div>

  css`
    .box {
      padding: 16px;
      background-color: #f0f0f0;
      border-radius: 8px;
    }
  `
}
```

Both `styl` and `css` work identically — the only difference is syntax.

## The `styleName` Prop

The `styleName` prop connects your JSX elements to CSS class selectors. It accepts a string, array, or object:

```jsx
// String
<div styleName="card" />

// Object - keys with truthy values are included
<div styleName={{ card: true, active, highlighted }} />

// Array - falsy values are filtered out
<div styleName={['card', active && 'active']} />

// Mixed - combine arrays, strings, and objects
<div styleName={['button', variant, { active, disabled }]} />
```

### Modifier Classes with Object/Array Syntax

The object and array syntax is cleaner than string interpolation for conditional classes. Name your variables to match the CSS class names for the cleanest syntax:

```jsx
function Card({ highlighted, compact }) {
  return (
    // Object shorthand - cleanest when variable names match class names
    <div styleName={{ card: true, highlighted, compact }}>
      Content
    </div>
  )

  styl`
    .card
      background white
      border 1px solid #ddd
      padding 16px
    .card.highlighted
      border-color gold
      box-shadow 0 0 10px gold
    .card.compact
      padding 8px
  `
}
```

Compare this to the less readable string interpolation:

```jsx
// Avoid - harder to read with multiple modifiers
<div styleName={`card ${highlighted ? 'highlighted' : ''} ${compact ? 'compact' : ''}`}>
```

### CSS Specificity

When multiple classes are applied, CSSX uses CSS specificity rules. The compound selector `.card.highlighted` has higher specificity than `.card` alone.

### Dynamic Styles

For truly dynamic values, combine `styleName` with the `style` prop:

```jsx
function ProgressBar({ progress }) {
  return (
    <div styleName="bar" style={{ width: `${progress}%` }}>
      {progress}%
    </div>
  )

  styl`
    .bar
      height 20px
      background-color #4caf50
      transition width 0.3s
  `
}
```

## Stylus Syntax

CSSX uses Stylus, a flexible CSS preprocessor. Here are the key features:

### Minimal Syntax

Braces, colons, and semicolons are optional:

```stylus
// All of these are equivalent:

.box
  padding 16px
  margin 8px

.box {
  padding: 16px;
  margin: 8px;
}

.box { padding: 16px; margin: 8px }
```

### Nesting

Nest selectors using indentation:

```stylus
.card
  padding 16px
  .header
    font-weight bold
  .content
    color #666
```

### Parent Reference (`&`)

Use `&` to reference the parent selector:

```stylus
.button
  background blue
  &.primary
    background green
  &.disabled
    opacity 0.5
```

This compiles to `.button.primary`, `.button.disabled`.

### Variables

Define and use Stylus variables:

```stylus
$primary = #007bff
$spacing = 16px

.button
  background $primary
  padding $spacing
```

## Global Stylus Configuration

Create a `styles/index.styl` file in your project root to define global Stylus variables, mixins, and helper classes. This file is automatically imported into every `styl` block.

```
my-project/
  styles/
    index.styl    ← Automatically imported everywhere
  src/
    components/
      Button.jsx
```

### Global Variables

Define breakpoints, colors, and other constants:

```stylus
// styles/index.styl

// Breakpoints
$mobile = 480px
$tablet = 768px
$desktop = 1024px

// Colors
$primary = #007bff
$secondary = #6c757d
$success = #28a745
$danger = #dc3545

// Spacing
$spacing-sm = 8px
$spacing-md = 16px
$spacing-lg = 24px
```

Use them in any component:

```jsx
function Card() {
  return <div styleName="card">...</div>

  styl`
    .card
      padding $spacing-md
      background $primary

      @media (min-width: $tablet)
        padding $spacing-lg
  `
}
```

### Global Mixins

Define reusable style patterns:

```stylus
// styles/index.styl

// Flexbox helpers
flex-center()
  display flex
  align-items center
  justify-content center

flex-between()
  display flex
  align-items center
  justify-content space-between

// Truncate text
truncate()
  overflow hidden
  text-overflow ellipsis
  white-space nowrap
```

Use mixins in components:

```jsx
styl`
  .header
    flex-between()
    padding $spacing-md

  .title
    truncate()
    max-width 200px
`
```

### Global Helper Classes

Define utility classes available everywhere:

```stylus
// styles/index.styl

.text-center
  text-align center

.text-bold
  font-weight bold

.hidden
  display none

.mt-1
  margin-top $spacing-sm

.mt-2
  margin-top $spacing-md
```

Use them alongside component classes:

```jsx
<div styleName="card mt-2">
  <h2 styleName="title text-center">Hello</h2>
</div>
```

## The `u` Unit

CSSX includes a custom `u` unit based on an 8px grid (Material Design spacing):

```stylus
.card
  padding 2u        // 16px
  margin 1u         // 8px
  gap 0.5u          // 4px
  border-radius 1u  // 8px
```

This ensures consistent spacing throughout your app.

## Media Queries

Use standard CSS media queries for responsive styles:

```stylus
.container
  padding 16px

  @media (min-width: 768px)
    padding 32px
    max-width 768px

  @media (min-width: 1024px)
    max-width 1024px
```

## Style Priority

When the same property is defined in multiple places, CSSX follows this priority (highest to lowest):

1. **Inline `style` prop** - Always wins
2. **Local styles** - `styl` inside the component function
3. **Global styles** - `styl` at module level
4. **File styles** - Imported `.styl` files

```jsx
// Lower priority (module level)
styl`
  .box
    color blue
`

function Component() {
  return (
    // Highest priority (inline)
    <div styleName="box" style={{ color: 'red' }}>
      This is red
    </div>
  )

  // Medium priority (function level)
  styl`
    .box
      color green
  `
}
```

## Best Practices

### Use Semantic Class Names

```stylus
// Good - describes purpose
.card-header
.submit-button
.error-message

// Avoid - describes appearance
.blue-box
.big-text
.margin-top-16
```

### Group Related Styles

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
  box-shadow 0 2px 4px rgba(0,0,0,0.1)
```

### Keep Styles Close to Components

Place `styl` blocks in the same file as the component they style. This makes it easy to find and modify styles.

## Next Steps

- [Component Parts](/guide/component-parts) - Style child component internals with `:part()`
- [CSS Variables](/guide/variables) - Dynamic theming with `var()`
- [Pug Templates](/guide/pug) - Optional JSX alternative
