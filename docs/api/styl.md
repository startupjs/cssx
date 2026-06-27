# styl Template

The `styl` template literal lets you write styles using [Stylus](https://stylus-lang.com/) syntax.

## Basic Usage

```jsx
import { styl } from 'cssxjs'
import { Pressable, Text } from 'react-native'

function Button({ children }) {
  return (
    <Pressable styleName="button">
      <Text styleName="text">{children}</Text>
    </Pressable>
  )

  styl`
    .button
      padding 12px 24px
      background #007bff
      border-radius 8px
    .text
      color white
  `
}
```

## Placement

**Inside a function** — styles are scoped to that component:

```jsx
import { View } from 'react-native'

function Card() {
  return <View styleName="card">...</View>

  styl`
    .card
      background white
  `
}
```

**At module level** — styles are shared across all components in the file:

```jsx
import { Pressable, Text } from 'react-native'

styl`
  .shared-button
    padding 12px 24px
`

function ButtonA() {
  return (
    <Pressable styleName="shared-button">
      <Text>A</Text>
    </Pressable>
  )
}

function ButtonB() {
  return (
    <Pressable styleName="shared-button">
      <Text>B</Text>
    </Pressable>
  )
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

### JavaScript Interpolation

Function-scoped `styl` templates support JavaScript interpolation in CSS value
positions:

```jsx
function Button({ color, spacing }) {
  return <View styleName="button" />

  styl`
    .button
      background ${color}
      padding ${spacing}px 12px
  `
}
```

Interpolation is lowered through the same runtime value path as `var()`, so it
can be used for whole values, parts of shorthands, and values nested inside
functions. It is not supported in module-level templates because there is no
render-time value array there.

## Selectors

| Selector | Description |
|----------|-------------|
| `.class` | Class selector |
| `.class1.class2` | Multiple classes (same element) |
| `&.modifier` | Modifier class (used within parent) |
| `:part(name)` | Part selector |
| `:hover` | Emits `hoverStyle`, same as `:part(hover)` |
| `:active` | Emits `activeStyle`, same as `:part(active)` |

> **Note:** Descendant selectors (`.parent .child`) are not supported. Apply modifiers directly to each element that needs styling.

> **Note:** `:focus`, other pseudo-classes, and pseudo-elements (`::before`, `::after`) are not supported. Use state-based modifiers for those cases.

### Part Selector

Target internal parts of child components:

```stylus
.button:part(icon)
  color red

.button:part(text)
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

- JavaScript interpolation is local-only: module-level `styl` templates must be plain template literals
- Interpolation is value-only, not selector or property-name interpolation
- For runtime-generated plain CSS strings, use the [Runtime Compilation API](/api/runtime)

## See Also

- [css Template](/api/css) — Plain CSS alternative
- [styl() Function](/api/styl-function) — Apply styles via spread
- [styleName Prop](/api/jsx-props) — Connect elements to styles
- [Runtime Compilation](/api/runtime) — Compile generated CSS strings
