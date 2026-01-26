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

function Button({ children }) {
  return <div styleName="button">{children}</div>

  styl`
    .button
      background-color #007bff
      padding 16px
      border-radius 8px
  `
}
```

You can also use plain CSS if you prefer:

```jsx
import { css } from 'cssxjs'

function Button({ children }) {
  return <div styleName="button">{children}</div>

  css`
    .button {
      background-color: #007bff;
      padding: 16px;
      border-radius: 8px;
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
// Parent can style Button's internal parts
styl`
  .myButton::part(icon)
    color green
  .myButton::part(text)
    font-weight bold
`
```

### Dynamic CSS Variables

Use CSS `var()` syntax with runtime updates:

```jsx
import { variables } from 'cssxjs'

// Change theme at runtime
variables['--primary-color'] = isDarkMode ? '#fff' : '#000'
```

### Material Design Grid

Built-in `u` unit (1u = 8px) for consistent spacing:

```css
.card
  padding 2u      /* 16px */
  margin 1u       /* 8px */
  gap 0.5u        /* 4px */
```

### Performance Optimized

Automatic style caching prevents unnecessary re-renders. With the optional teamplay integration, styles are memoized and only recalculated when dependencies change.

## How It Works

1. **Build Time**: Babel transforms `styl` template literals into optimized style objects
2. **Runtime**: The `styleName` prop applies matching styles based on class names
3. **Parts**: Components expose styled parts that parents can override

```jsx
import { styl } from 'cssxjs'

function Card({ children, variant }) {
  return (
    <div styleName={`card ${variant}`}>
      <div part="header" styleName="header">
        <span part="title">Title</span>
      </div>
      <div part="content">{children}</div>
    </div>
  )

  styl`
    .card
      background white
      border-radius 8px
      &.primary
        border 2px solid var(--primary-color)
    .header
      padding 2u
    .title
      font-size 18px
      font-weight bold
  `
}
```

## Next Steps

- [Installation](/guide/installation) - Set up CSSX in your project
- [Basic Usage](/guide/usage) - Learn the core concepts
- [Component Parts](/guide/component-parts) - Style component internals
- [CSS Variables](/guide/variables) - Dynamic theming
