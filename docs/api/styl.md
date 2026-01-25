# styl Template

The `styl` template literal lets you write styles using [Stylus](https://stylus-lang.com/) syntax.

## Basic Usage

```jsx
import { styl } from 'cssxjs'

function Button({ children }) {
  return <button styleName="button">{children}</button>

  styl`
    .button
      padding 12px 24px
      background #007bff
      color white
      border-radius 8px
  `
}
```

## Placement

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

**At module level** — styles are shared across all components in the file:

```jsx
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

## Stylus Syntax

### Minimal Syntax

Braces, colons, and semicolons are optional:

```stylus
// All equivalent:
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

### Parent Reference (&)

Use `&` to reference the parent selector:

```stylus
.button
  background blue
  &.primary
    background green
  &.disabled
    opacity 0.5
```

Compiles to `.button.primary`, `.button.disabled`.

### Variables

Define and use Stylus variables:

```stylus
$primary = #007bff
$spacing = 16px

.button
  background $primary
  padding $spacing
```

### Mixins

Define reusable style patterns:

```stylus
flex-center()
  display flex
  align-items center
  justify-content center

.container
  flex-center()
  padding 16px
```

## Global Configuration

Create `styles/index.styl` in your project root. This file is automatically imported into every `styl` block:

```stylus
// styles/index.styl

// Variables
$primary = #007bff
$spacing-md = 16px

// Mixins
flex-center()
  display flex
  align-items center
  justify-content center

// Global helper classes
.text-center
  text-align center
```

Use anywhere in your app:

```jsx
styl`
  .card
    padding $spacing-md
    background $primary
    flex-center()
`
```

## The `u` Unit

CSSX adds a custom `u` unit where `1u = 8px` (Material Design grid):

```stylus
.card
  padding 2u        // 16px
  margin 1u         // 8px
  gap 0.5u          // 4px
  border-radius 1u  // 8px
```

## Supported CSS Features

### Media Queries

```stylus
.container
  padding 16px

  @media (max-width: 768px)
    padding 8px
```

### Viewport Units

```stylus
.hero
  height 100vh
  width 100vw
```

### CSS Variables

```stylus
.button
  background var(--primary-color, #007bff)
  color var(--text-color, white)
```

See [CSS Variables](/api/variables) for runtime variable updates.

## Selectors

| Selector | Description |
|----------|-------------|
| `.class` | Class selector |
| `.class1.class2` | Multiple classes (AND) |
| `.parent .child` | Descendant (same element) |
| `&.modifier` | Modifier class |
| `::part(name)` | Part selector |

### Part Selector

Target internal parts of child components:

```stylus
.button::part(icon)
  color red

.button::part(text)
  font-weight bold
```

Single colon shorthand also works: `.button:part(icon)`

See [Component Parts](/guide/component-parts) for details.

## Style Priority

When the same property is defined in multiple places (highest to lowest):

1. Inline `style` prop
2. Local styles (`styl` inside function)
3. Global styles (`styl` at module level)
4. File styles (imported `.cssx.styl` files)

## Limitations

- No expression interpolations: `` styl`color ${color}` `` is not allowed
- Must be a plain template literal
- For dynamic values, use CSS variables or the `style` prop

## See Also

- [css Template](/api/css) — Plain CSS alternative
- [styl() Function](/api/styl-function) — Apply styles via spread
- [styleName Prop](/api/jsx-props) — Connect elements to styles
