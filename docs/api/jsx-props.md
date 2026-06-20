# JSX Props

CSSX extends JSX with custom props for styling.

## styleName

Apply class-based styles to an element. Works like `className` but with scoped, processed styles.

```jsx
<View styleName="card featured">
  <Text>Content</Text>
</View>
```

**Syntax Options:**

```jsx
// String — simple static class
<View styleName="card" />

// Array with object — recommended for dynamic classes
<View styleName={['card', variant, { active, disabled }]} />
```

### Array Pattern (Recommended)

Use arrays with an object at the end for modifiers:

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
      border-width 1px
      border-color #ddd
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

The pattern:
- Static base classes first (`'card'`)
- Dynamic variant strings next (`variant` — could be `'featured'`, `'simple'`, etc.)
- Boolean modifiers in an object at the end (`{ highlighted, compact }`)

**Tip:** Name variables to match class names for clean shorthand: `{ active }` instead of `{ active: isActive }`.

### Dynamic Styles

For CSS values that come from props, prefer function-scoped template
interpolation:

```jsx
import { View, Text } from 'react-native'

function ProgressBar({ progress, color }) {
  return (
    <View styleName="bar">
      <Text>{progress}%</Text>
    </View>
  )

  styl`
    .bar
      width ${progress}%
      height 20px
      background-color ${color}
  `
}
```

For ad hoc overrides, combine `styleName` with the regular `style` prop.

---

## part

Expose an element for external styling via `:part()`.

```jsx
import { Pressable, Text } from 'react-native'

function Button({ children }) {
  return (
    <Pressable part="root" styleName="root">
      <Text part="icon" styleName="icon">★</Text>
      <Text part="text" styleName="text">{children}</Text>
    </Pressable>
  )
}
```

The Babel transform automatically injects the part style props — no manual prop spreading needed.

Parent components can then style these parts:

```jsx
styl`
  .my-button:part(icon)
    color gold
  .my-button:part(text)
    font-weight bold
`
```

### How Parts Work

1. Child component marks elements with `part="name"`
2. Parent uses `:part(name)` selector to target those elements
3. Babel transforms both sides to connect them automatically

See the [Component Parts guide](/guide/component-parts) for detailed examples.

---

## cssx()

The low-level runtime helper that resolves a compiled or runtime sheet and
returns props to spread onto a component. Most components should use
`styleName`; use `cssx()` when CSS arrives as a runtime string or when a custom
component cannot use the Babel transform.

**Signature:**
```ts
function cssx(
  styleName: string | array | object,
  sheet: string | CompiledCssSheet | TrackedCssxSheet,
  inlineStyleProps?: object
): object
```

`cssx()` returns an object with `style` and any part style props such as
`titleStyle`, `hoverStyle`, or `activeStyle`.

See [Runtime Compilation](/api/runtime) for generated CSS strings, diagnostics,
tracking, and caching behavior.
