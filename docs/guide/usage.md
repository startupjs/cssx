# Basic Usage

This guide covers the essentials of CSSX: writing styles and applying them to components.

## Quick Start

```jsx
import { styl } from 'cssxjs'
import { Pressable, Text } from 'react-native'

function Button({ children, variant, disabled }) {
  return (
    <Pressable styleName={['button', variant, { disabled }]}>
      <Text styleName="text">{children}</Text>
    </Pressable>
  )

  styl`
    .button
      padding 12px 24px
      border-radius 8px

      &.primary
        background #007bff

      &.disabled
        opacity 0.5

    .text
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

The `styleName` prop connects elements to CSS classes. For simple cases, use a string:

```jsx
<View styleName="card" />
```

### The Recommended Pattern

For dynamic styling, use the **array pattern** — it's the cleanest and most maintainable approach:

```jsx
<View styleName={['card', variant, { highlighted, compact }]} />
```

This pattern has three parts, in order:

1. **Base class** — the main class name (`'card'`)
2. **Variant variables** — string variables that map to class names (`variant`)
3. **Boolean modifiers** — an object where keys become classes when values are truthy (`{ highlighted, compact }`)

**Example breakdown:**

```jsx
import { View, Text } from 'react-native'

function Card({ variant = 'default', highlighted, compact, children }) {
  // If variant='featured', highlighted=true, compact=false
  // Results in: styleName="card featured highlighted"
  return (
    <View styleName={['card', variant, { highlighted, compact }]}>
      <Text>{children}</Text>
    </View>
  )

  styl`
    .card
      background white
      padding 16px

      &.featured
        border-width 2px
        border-color gold

      &.highlighted
        shadow-color gold
        shadow-radius 10px

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
import { View, Text } from 'react-native'

function Card({ variant, highlighted, compact, children }) {
  return (
    <View styleName={['card', variant, { highlighted, compact }]}>
      <Text>{children}</Text>
    </View>
  )

  styl`
    .card
      background white
      padding 16px

      &.featured
        border-width 2px
        border-color gold

      &.highlighted
        shadow-color gold
        shadow-radius 10px

      &.compact
        padding 8px
  `
}
```

## Dynamic Values

For component props that should feed CSS values, use JavaScript interpolation in
function-scoped `css` or `styl` templates:

```jsx
import { View } from 'react-native'

function ProgressBar({ progress, color }) {
  return <View styleName="bar" />

  styl`
    .bar
      height 20px
      width ${progress}%
      background ${color}
  `
}
```

Interpolation is supported only in CSS value positions. For ad hoc overrides,
combine `styleName` with the `style` prop:

```jsx
import { View } from 'react-native'

function ProgressBar({ progress }) {
  return (
    <View styleName="bar" style={{ width: `${progress}%` }} />
  )

  styl`
    .bar
      height 20px
      background #4caf50
  `
}
```

Use [CSS Variables](/guide/variables) for app-wide runtime theming and shared
tokens.

## Style Placement

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

**At module level** — styles are shared across the file:

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
| Part selectors | `:part(icon)`, `:part(text)` | |
| Hover and active aliases | `:hover`, `:active` | Emits `hoverStyle` and `activeStyle` |
| CSS variables | `var(--color)`, `var(--size, 16px)` | |
| JavaScript interpolation | ``color ${value}`` | Function-scoped templates only |
| Animations | `animation fadeIn 0.3s ease` | Reanimated v4 components only |
| Keyframes | `@keyframes fadeIn` | Reanimated v4 components only |
| Transitions | `transition background 0.2s` | Reanimated v4 components only |
| Media queries | `@media (min-width: 768px)` | |
| Filters | `filter blur(8px)` | Current React Native versions |
| Background gradients | `background-image linear-gradient(...)` | RN emits `experimental_backgroundImage` |
| Most CSS properties | `padding`, `margin`, `flex`, `color`, etc. | |
| Custom `u` unit | `padding 2u` | 1u = 8px |

> **Note:** Animations and transitions require [Reanimated v4](https://docs.swmansion.com/react-native-reanimated/) components (`Animated.View`, `Animated.Text`, etc.). See [Animations guide](/guide/animations) for details.

### Not Supported

| Feature | Alternative |
|---------|-------------|
| `:focus` | Use `onFocus`/`onBlur` with `&.focused` modifier |
| `::before`, `::after` | Use a real element with its own styles |
| Descendant selectors | `.parent .child` — add modifier to child directly |
| Attribute selectors | `[type="text"]` — use class modifiers instead |
| `:first-child`, `:nth-child` | Handle in JS when rendering |
| URL background images | Use platform image components |

### Hover and Active Props

CSSX emits `hoverStyle` and `activeStyle` for `:hover` and `:active`. Components
can choose how to apply those props:

```jsx
import { useState } from 'react'
import { Pressable, Text } from 'react-native'

function InteractiveBox({ style, hoverStyle, activeStyle, children, onPress }) {
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)

  return (
    <Pressable
      style={[style, hovered && hoverStyle, pressed && activeStyle]}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={onPress}
    >
      {children}
    </Pressable>
  )
}

function Button({ children, onPress }) {
  return (
    <InteractiveBox styleName="button" onPress={onPress}>
      <Text styleName="text">{children}</Text>
    </InteractiveBox>
  )

  styl`
    .button
      background #007bff

      &:hover
        background #0056b3

      &:active
        transform scale(0.97)

    .text
      color white
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
