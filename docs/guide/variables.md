# CSS Variables

CSSX supports CSS custom properties (`var()`) with a twist: you can change variable values at runtime, and your components will automatically re-render with the new values.

## Basic Usage

Use standard CSS `var()` syntax in your styles:

```jsx
import { styl } from 'cssxjs'
import { Pressable, Text } from 'react-native'

function ThemedButton({ children }) {
  return (
    <Pressable styleName="button">
      <Text styleName="text">{children}</Text>
    </Pressable>
  )

  styl`
    .button
      background-color var(--primary-color, #007bff)
      padding var(--button-padding, 12px 24px)
      border-radius var(--border-radius, 8px)
    .text
      color var(--text-color, white)
  `
}
```

The second argument in `var()` is the fallback value used when the variable is not set.

## Setting Default Variables

Use `setDefaultVariables` to define your theme at app startup:

```jsx
// App.jsx or theme.js
import { setDefaultVariables } from 'cssxjs'

// Call this early in your app initialization
setDefaultVariables({
  '--primary-color': '#007bff',
  '--secondary-color': '#6c757d',
  '--success-color': '#28a745',
  '--danger-color': '#dc3545',
  '--text-color': '#333',
  '--background-color': '#fff',
  '--border-radius': '8px',
  '--spacing-sm': '8px',
  '--spacing-md': '16px',
  '--spacing-lg': '24px'
})
```

These values take precedence over inline fallbacks in `var()`.

## Dynamic Variables (Runtime Updates)

Import `variables` to change values at runtime:

```jsx
import { useState } from 'react'
import { variables } from 'cssxjs'
import { Pressable, Text } from 'react-native'

function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)

  const toggleTheme = () => {
    const newIsDark = !isDark
    setIsDark(newIsDark)

    if (newIsDark) {
      variables['--primary-color'] = '#bb86fc'
      variables['--background-color'] = '#121212'
      variables['--text-color'] = '#ffffff'
    } else {
      variables['--primary-color'] = '#007bff'
      variables['--background-color'] = '#ffffff'
      variables['--text-color'] = '#333333'
    }
  }

  return (
    <Pressable onPress={toggleTheme}>
      <Text>{isDark ? 'Light Mode' : 'Dark Mode'}</Text>
    </Pressable>
  )
}
```

When you assign to `variables`, all components using those variables automatically re-render.

## Variable Priority

Variables are resolved in this order (highest priority first):

1. **Runtime variables** (`variables['--name']`)
2. **Default variables** (`setDefaultVariables()`)
3. **Inline fallback** (`var(--name, fallback)`)

```jsx
setDefaultVariables({ '--color': 'blue' })    // Priority 2
variables['--color'] = 'red'                   // Priority 1 (wins)

styl`
  .box
    color var(--color, green)  // Will be 'red'
`
```

## Using Variables in Complex Values

Variables work within compound CSS values:

```jsx
styl`
  .card
    box-shadow var(--shadow-x, 0) var(--shadow-y, 4px) var(--shadow-blur, 8px) var(--shadow-color, rgba(0,0,0,0.1))

    border var(--border-width, 1px) solid var(--border-color, #ddd)

    transform translateX(var(--translate-x, 0)) scale(var(--scale, 1))
`
```

## Practical Example: Theme System

Here's a complete theming implementation:

```jsx
// theme.js
import { setDefaultVariables, variables } from 'cssxjs'

const lightTheme = {
  '--bg-primary': '#ffffff',
  '--bg-secondary': '#f5f5f5',
  '--text-primary': '#333333',
  '--text-secondary': '#666666',
  '--accent': '#007bff',
  '--border': '#e0e0e0'
}

const darkTheme = {
  '--bg-primary': '#1a1a1a',
  '--bg-secondary': '#2d2d2d',
  '--text-primary': '#ffffff',
  '--text-secondary': '#b0b0b0',
  '--accent': '#bb86fc',
  '--border': '#404040'
}

// Initialize with light theme
setDefaultVariables(lightTheme)

export function setTheme(theme) {
  const values = theme === 'dark' ? darkTheme : lightTheme
  Object.assign(variables, values)
}

export function getTheme() {
  return variables['--bg-primary'] === darkTheme['--bg-primary']
    ? 'dark'
    : 'light'
}
```

```jsx
// App.jsx
import { styl } from 'cssxjs'
import { View, Text, Pressable } from 'react-native'
import { setTheme } from './theme'

function App() {
  return (
    <View styleName="app">
      <View styleName="header">
        <Text styleName="title">My App</Text>
        <Pressable onPress={() => setTheme('dark')}>
          <Text>Dark</Text>
        </Pressable>
        <Pressable onPress={() => setTheme('light')}>
          <Text>Light</Text>
        </Pressable>
      </View>
      <View styleName="content">
        <Text styleName="text">Content here</Text>
      </View>
    </View>
  )

  styl`
    .app
      flex 1
      background var(--bg-primary)

    .header
      background var(--bg-secondary)
      padding 16px
      border-bottom-width 1px
      border-bottom-color var(--border)

    .title
      font-size 20px
      color var(--text-primary)

    .content
      padding 24px

    .text
      color var(--text-primary)
  `
}
```

## Variables with `u` Units

Combine CSS variables with the `u` unit system:

```jsx
setDefaultVariables({
  '--card-padding': '2u',      // 16px
  '--button-height': '5u',     // 40px
  '--spacing': '1u'            // 8px
})
```

## Tips and Best Practices

### Naming Convention

Use a consistent naming scheme:

```jsx
setDefaultVariables({
  // Colors
  '--color-primary': '#007bff',
  '--color-secondary': '#6c757d',
  '--color-background': '#fff',
  '--color-text': '#333',

  // Typography
  '--font-size-sm': '12px',
  '--font-size-md': '14px',
  '--font-size-lg': '18px',

  // Spacing
  '--space-xs': '4px',
  '--space-sm': '8px',
  '--space-md': '16px',
  '--space-lg': '24px',

  // Components
  '--button-bg': 'var(--color-primary)',
  '--button-text': '#fff',
  '--card-shadow': '0 2px 8px rgba(0,0,0,0.1)'
})
```

### Always Provide Fallbacks

In case a variable isn't set, provide sensible defaults:

```stylus
.button
  // Good - has fallback
  background var(--button-bg, #007bff)

  // Risky - no fallback
  background var(--button-bg)
```

### Group Related Variables

```jsx
// colors.js
export const colors = {
  '--color-primary': '#007bff',
  '--color-secondary': '#6c757d',
  // ...
}

// spacing.js
export const spacing = {
  '--space-sm': '8px',
  '--space-md': '16px',
  // ...
}

// theme.js
import { setDefaultVariables } from 'cssxjs'
import { colors } from './colors'
import { spacing } from './spacing'

setDefaultVariables({
  ...colors,
  ...spacing
})
```

## Next Steps

- [Pug Templates](/guide/pug) - Alternative JSX syntax
- [Animations](/guide/animations) - CSS transitions and keyframes
- [Caching](/guide/caching) - Performance optimization with teamplay
