# Component Parts

One of CSSX's most powerful features is the ability to style internal parts of child components from the parent. This is similar to [CSS Shadow Parts](https://developer.mozilla.org/en-US/docs/Web/CSS/::part) in web components.

## The Problem

Imagine you have a reusable `Button` component with an icon and text:

```jsx
import { View, Text } from 'react-native'

function Button({ icon, children }) {
  return (
    <View styleName="button">
      <Text styleName="icon">{icon}</Text>
      <Text styleName="text">{children}</Text>
    </View>
  )
}
```

How can a parent component customize the icon or text styles? With traditional approaches, you'd need to:
- Pass style props (`iconStyle`, `textStyle`)
- Use complex class name conventions
- Expose internal implementation details

## The Solution: `part` and `:part()`

CSSX solves this with the `part` attribute and `:part()` selector:

### Step 1: Expose Parts in the Component

Use the `part` attribute to mark styleable elements:

```jsx
import { View, Text } from 'react-native'

function Button({ icon, children }) {
  return (
    <View part="root" styleName="root">
      <Text part="icon" styleName="icon">{icon}</Text>
      <Text part="text" styleName="text">{children}</Text>
    </View>
  )

  styl`
    .root
      flex-direction row
      align-items center
      gap 8px
      padding 12px 24px
      background #007bff
      border-radius 8px
    .icon
      font-size 20px
    .text
      color white
  `
}
```

### Step 2: Style Parts from the Parent

Use `:part()` to target those parts:

```jsx
import { View } from 'react-native'

function App() {
  return (
    <View>
      <Button styleName="primary-button" icon="★">
        Click Me
      </Button>
    </View>
  )

  styl`
    .primary-button
      background #28a745
    .primary-button:part(icon)
      color gold
    .primary-button:part(text)
      font-weight bold
  `
}
```

The parent's styles are merged with the component's internal styles.

## How It Works

When you use `:part(name)`, CSSX:

1. Creates a style prop named `{name}Style` (e.g., `iconStyle`, `textStyle`)
2. Passes it automatically to the child component
3. The child's `part="name"` element receives these styles

```jsx
// This:
<Button styleName="my-button" />
styl`
  .my-button:part(icon)
    color red
`

// Effectively becomes:
<Button iconStyle={{ color: 'red' }} />
```

### The `root` Part

The `part="root"` is special — it maps to the standard `style` prop instead of `rootStyle`. This means styles applied to a component's class name automatically reach the root element:

```jsx
// This:
<Button styleName="my-button" />
styl`
  .my-button
    background green
`

// Effectively becomes:
<Button style={{ background: 'green' }} />
```

You don't need to write `:part(root)` explicitly — just style the class directly. This makes `part="root"` work seamlessly with any component that accepts a `style` prop, including third-party components and React Native built-ins.

## Complete Example

Here's a full example showing a customizable Card component:

```jsx
// Card.jsx
import { styl } from 'cssxjs'
import { View, Text } from 'react-native'

export function Card({ title, children }) {
  return (
    <View part="root" styleName="root">
      <View part="header" styleName="header">
        <Text part="title" styleName="title">{title}</Text>
      </View>
      <View part="content" styleName="content">
        {children}
      </View>
    </View>
  )

  styl`
    .root
      background white
      border-radius 12px
    .header
      padding 16px
      border-bottom-width 1px
      border-bottom-color #eee
    .title
      font-size 18px
    .content
      padding 16px
  `
}
```

```jsx
// App.jsx
import { styl } from 'cssxjs'
import { View, Text } from 'react-native'
import { Card } from './Card'

function App() {
  return (
    <View styleName="container">
      {/* Default styling */}
      <Card styleName="card" title="Default Card">
        <Text>Regular content</Text>
      </Card>

      {/* Custom styled card */}
      <Card styleName="featured-card" title="Featured">
        <Text>Special content</Text>
      </Card>
    </View>
  )

  styl`
    .container
      flex-direction row
      gap 16px
      padding 24px

    .card
      flex 1

    .featured-card
      flex 1
      background #667eea
      &:part(header)
        border-bottom-color rgba(255,255,255,0.2)
      &:part(title)
        color white
      &:part(content)
        color rgba(255,255,255,0.9)
  `
}
```

## Nested Parts

Parts work at any nesting level:

```jsx
function Page() {
  return (
    <Layout styleName="page">
      <Card styleName="main-card" title="Welcome">
        Content here
      </Card>
    </Layout>
  )

  styl`
    .page:part(sidebar)
      width 250px

    .main-card:part(header)
      background #f5f5f5
  `
}
```

## Part Naming Conventions

Use clear, semantic names for parts:

```jsx
// Good part names
part="root"       // The main container
part="header"     // Header section
part="title"      // Title text
part="content"    // Main content area
part="footer"     // Footer section
part="icon"       // Icon element
part="label"      // Label text
part="input"      // Input field

// Avoid
part="div1"       // Not descriptive
part="wrapper"    // Too generic
part="theBlueBox" // Describes appearance
```

## Multiple and Conditional Parts

An element can expose multiple parts, and parts can be conditionally applied based on component state.

### Multiple Parts (Space-Separated)

Use space-separated names to expose multiple parts on one element:

```jsx
import { View } from 'react-native'

function ListItem({ children }) {
  return (
    <View part="item row" styleName="item">
      {children}
    </View>
  )
}
```

Parents can style either part:

```jsx
styl`
  .my-list:part(item)
    padding 12px
  .my-list:part(row)
    flex-direction row
`
```

### Conditional Parts (Array Syntax)

Use an array with an object to conditionally apply parts based on props or state:

```jsx
import { View } from 'react-native'

function ListItem({ layout, selected, children }) {
  return (
    <View
      part={['item', { row: layout === 'row', column: layout === 'column', selected }]}
      styleName="item"
    >
      {children}
    </View>
  )
}
```

- `'item'` — always exposed as a part
- `row: layout === 'row'` — exposed only when `layout` is `'row'`
- `column: layout === 'column'` — exposed only when `layout` is `'column'`
- `selected` — exposed when the `selected` prop is truthy (shorthand for `selected: selected`)

Parents can then style each conditional part:

```jsx
styl`
  .my-list:part(item)
    padding 12px

  .my-list:part(row)
    flex-direction row

  .my-list:part(column)
    flex-direction column

  .my-list:part(selected)
    background #e3f2fd
`
```

### Object-Only Syntax

You can also use just an object for all conditional parts:

```jsx
<View part={{ content: true, active, disabled: isDisabled }} />
```

### Limitations

Part names must be **statically known at compile time**. The Babel transform needs to generate the corresponding `*Style` props, so it must know all possible part names.

**Allowed:**
```jsx
part="root icon"                              // Static string
part={['content', { active }]}                // Array with static strings and objects
part={{ content: true, active }}              // Object with static keys
part={['item', { selected: isSelected }]}     // Boolean expressions as values
```

**Not allowed:**
```jsx
part={variant}                    // Dynamic value — part names unknown
part={['card', variant]}          // Dynamic string in array
part={{ [variant]: true }}        // Computed/dynamic key
part={{ ...partConfig }}          // Spread operator
```

If you need fully dynamic parts, pass style props directly instead of using the `part` system.

## Compound Selectors with Parts

Combine class selectors with parts for conditional styling:

```jsx
styl`
  .button:part(icon)
    color gray

  .button.primary:part(icon)
    color white

  .button.danger:part(icon)
    color red
`
```

The more specific selector wins (standard CSS specificity).

## Best Practices

### Always Expose a `root` Part

```jsx
import { View } from 'react-native'

function Component() {
  return (
    <View part="root" styleName="root">
      ...
    </View>
  )
}
```

This lets parents style the component's container.

> **Note:** You don't need to manually spread props. The Babel transform automatically injects the part style props where needed.

### Document Available Parts

In component documentation, list the available parts:

```jsx
/**
 * Button component
 *
 * Parts:
 * - root: The button container
 * - icon: The icon element (optional)
 * - text: The button text
 */
function Button({ ... }) { }
```

### Keep Parts Stable

Part names are part of your component's public API. Avoid changing them in minor versions.

## Next Steps

- [CSS Variables](/guide/variables) - Dynamic theming with `var()`
- [Pug Templates](/guide/pug) - Alternative JSX syntax
- [Examples](/examples/) - Complete component examples
