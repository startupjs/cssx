# Introduction

CSSX is a CSS-in-JS library that lets you write **actual CSS syntax** directly inside your JavaScript/TypeScript files. Unlike other CSS-in-JS solutions that use JavaScript objects to represent styles, CSSX uses real CSS — either plain CSS or [Stylus](https://stylus-lang.com/) syntax — giving you the full power of CSS with all its familiar syntax.

## Why CSSX?

### The Problem

Most CSS-in-JS libraries force you to write styles as JavaScript objects:

```jsx
// Traditional CSS-in-JS approach
const styles = {
  button: {
    backgroundColor: '#007bff',
    paddingTop: 16,
    paddingBottom: 16,
    borderRadius: 8
  }
}
```

This has several drawbacks:
- Unfamiliar syntax (camelCase, no units, no shorthands)
- No CSS features like nesting, mixins, or variables
- Hard to copy styles from CSS references or design tools
- Different mental model from web CSS

### The Solution

With CSSX, you write real CSS:

```jsx
import { styl } from 'cssxjs'
import { View, Text } from 'react-native'

function Button({ children }) {
  return (
    <View styleName="root">
      <Text styleName="text">{children}</Text>
    </View>
  )

  styl`
    .root
      background-color #007bff
      padding 16px
      border-radius 8px
    .text
      color white
  `
}
```

You can also use plain CSS if you prefer:

```jsx
import { css } from 'cssxjs'
import { View, Text } from 'react-native'

function Button({ children }) {
  return (
    <View styleName="root">
      <Text styleName="text">{children}</Text>
    </View>
  )

  css`
    .root {
      background-color: #007bff;
      padding: 16px;
      border-radius: 8px;
    }
    .text {
      color: white;
    }
  `
}
```

## Key Features

### True CSS Syntax

Write CSS the way it was meant to be written. Choose between:

- **`styl`** - [Stylus](https://stylus-lang.com/) syntax with mixins, variables, and optional braces/semicolons
- **`css`** - Plain CSS syntax for familiarity or easier migration

Both support all standard CSS properties and `var()` variables.

### Cross-Platform

Works seamlessly on both **React Native** and **Web** (via react-native-web):

- Write once, run everywhere
- Same styles work on iOS, Android, and Web
- No platform-specific style files needed

### Component Composition with `:part()`

Style internal parts of child components from the parent — similar to CSS Shadow Parts:

```jsx
// Parent can style Button and its internal parts
styl`
  .myButton
    background green
    &:part(icon)
      color gold
    &:part(text)
      font-weight bold
`
```

### CSS Variables

Use CSS `var()` syntax with provider-scoped theme variables:

```jsx
import { CssxProvider, css } from 'cssxjs'

const theme = css`
  :root {
    --primary: oklch(0.58 0.22 260);
    --color-primary: var(--primary);
  }
`

<CssxProvider style={theme}>
  <App />
</CssxProvider>
```

### Provider Theming

Use `CssxProvider style` for scoped theme variables, theme selection, global
utility classes, and component tag overrides:

```jsx
import { CssxProvider, css } from 'cssxjs'

const theme = css`
  :root {
    --primary: oklch(0.58 0.22 260);
    --color-primary: var(--primary);
  }

  Button {
    border-radius: var(--radius-md);
  }
`

<CssxProvider theme='auto' style={theme}>
  <App />
</CssxProvider>
```

### Standard CSS Units

Use `rem`, CSS variables, and `calc()` for spacing:

```css
.card {
  padding: 1rem;
  gap: calc(var(--spacing) * 2);
}
```

The legacy `u` unit still compiles for migration (`1u = 8px`), but new styles
should prefer standard CSS units.

### Performance Optimized

Automatic style caching prevents unnecessary re-renders. Styles are memoized by
sheet, `styleName`, inline styles, interpolation values, and only the variables
or media queries that were actually used.

## How It Works

1. **Build Time**: Babel transforms `styl` template literals into optimized style objects
2. **Runtime**: The `styleName` prop applies matching styles based on class names
3. **Parts**: Components expose styled parts that parents can override

Use the `part` attribute to mark elements that can be styled from outside. The special `part="root"` maps to the standard `style` prop, letting parent components style your component directly:

```jsx
// Card.jsx
import { styl } from 'cssxjs'
import { View, Text } from 'react-native'

function Card({ title, children }) {
  return (
    <View part="root" styleName="root">
      <View part="header" styleName="header">
        <Text part="title" styleName="title">{title}</Text>
      </View>
      <View part="content" styleName="content">{children}</View>
    </View>
  )

  styl`
    .root
      background white
      border-radius 8px

    .header
      padding 2u

    .title
      font-size 18px
      font-weight bold

    .content
      padding 2u
  `
}
```

```jsx
// App.jsx — styling Card from the parent
import { styl } from 'cssxjs'
import { Card } from './Card'

function App() {
  return (
    <Card styleName="featured-card" title="Welcome">
      Hello world!
    </Card>
  )

  styl`
    .featured-card
      background #667eea
      &:part(title)
        color white
      &:part(content)
        color rgba(255,255,255,0.9)
  `
}
```

## Next Steps

- [Installation](/guide/installation) - Set up CSSX in your project
- [TypeScript Support](/guide/typescript) - Type-check Pug templates
- [Basic Usage](/guide/usage) - Learn the core concepts
- [Theming](/guide/theming) - Provider styles, theme assets, and component tags
- [Component Parts](/guide/component-parts) - Style component internals
- [CSS Variables](/guide/variables) - Dynamic theming
