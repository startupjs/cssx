# Component Parts

One of CSSX's most powerful features is the ability to style internal parts of child components from the parent. This is similar to [CSS Shadow Parts](https://developer.mozilla.org/en-US/docs/Web/CSS/::part) in web components.

## The Problem

Imagine you have a reusable `Button` component with an icon and text:

```jsx
function Button({ icon, children }) {
  return (
    <div styleName="button">
      <span styleName="icon">{icon}</span>
      <span styleName="text">{children}</span>
    </div>
  )
}
```

How can a parent component customize the icon or text styles? With traditional approaches, you'd need to:
- Pass style props (`iconStyle`, `textStyle`)
- Use complex class name conventions
- Expose internal implementation details

## The Solution: `part` and `::part()`

CSSX solves this with the `part` attribute and `::part()` selector:

### Step 1: Expose Parts in the Component

Use the `part` attribute to mark styleable elements:

```jsx
function Button({ icon, children }) {
  return (
    <div part="root" styleName="button">
      <span part="icon" styleName="icon">{icon}</span>
      <span part="text" styleName="text">{children}</span>
    </div>
  )

  styl`
    .button
      display flex
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

Use `::part()` (or `:part()`) to target those parts:

```jsx
function App() {
  return (
    <div>
      <Button styleName="primary-button" icon="★">
        Click Me
      </Button>
    </div>
  )

  styl`
    .primary-button::part(icon)
      color gold
    .primary-button::part(text)
      font-weight bold
      text-transform uppercase
  `
}
```

The parent's styles are merged with the component's internal styles.

## How It Works

When you use `::part(name)`, CSSX:

1. Creates a style prop named `{name}Style` (e.g., `iconStyle`, `textStyle`)
2. Passes it automatically to the child component
3. The child's `part="name"` element receives these styles

```jsx
// This:
<Button styleName="my-button" />
styl`
  .my-button::part(icon)
    color red
`

// Effectively becomes:
<Button iconStyle={{ color: 'red' }} />
```

## Complete Example

Here's a full example showing a customizable Card component:

```jsx
// Card.jsx
import { styl } from 'cssxjs'

export function Card({ title, children }) {
  return (
    <div part="root" styleName="card">
      <div part="header" styleName="header">
        <h3 part="title" styleName="title">{title}</h3>
      </div>
      <div part="content" styleName="content">
        {children}
      </div>
    </div>
  )

  styl`
    .card
      background white
      border-radius 12px
      box-shadow 0 2px 8px rgba(0,0,0,0.1)
    .header
      padding 16px
      border-bottom 1px solid #eee
    .title
      margin 0
      font-size 18px
    .content
      padding 16px
  `
}
```

```jsx
// App.jsx
import { styl } from 'cssxjs'
import { Card } from './Card'

function App() {
  return (
    <div styleName="container">
      {/* Default styling */}
      <Card styleName="card" title="Default Card">
        Regular content
      </Card>

      {/* Custom styled card */}
      <Card styleName="featured-card" title="Featured">
        Special content
      </Card>
    </div>
  )

  styl`
    .container
      display flex
      gap 16px
      padding 24px

    .card
      flex 1

    .featured-card
      flex 1
      &::part(root)
        background linear-gradient(135deg, #667eea, #764ba2)
      &::part(header)
        border-bottom-color rgba(255,255,255,0.2)
      &::part(title)
        color white
      &::part(content)
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
    .page::part(sidebar)
      width 250px

    .main-card::part(header)
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

## Compound Selectors with Parts

Combine class selectors with parts for conditional styling:

```jsx
styl`
  .button::part(icon)
    color gray

  .button.primary::part(icon)
    color white

  .button.danger::part(icon)
    color red
`
```

The more specific selector wins (standard CSS specificity).

## Best Practices

### Always Expose a `root` Part

```jsx
function Component() {
  return (
    <div part="root" styleName="root">
      ...
    </div>
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
