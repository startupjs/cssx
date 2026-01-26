# Theme System

Complete dark/light theme implementation using CSS variables.

## Theme Configuration

```jsx
// theme.js
import { setDefaultVariables, variables } from 'cssxjs'

const themes = {
  light: {
    '--bg-primary': '#ffffff',
    '--bg-secondary': '#f5f5f5',
    '--bg-tertiary': '#e0e0e0',
    '--text-primary': '#333333',
    '--text-secondary': '#666666',
    '--text-muted': '#999999',
    '--accent': '#007bff',
    '--accent-hover': '#0056b3',
    '--border': '#e0e0e0',
    '--shadow': 'rgba(0,0,0,0.1)'
  },
  dark: {
    '--bg-primary': '#1a1a1a',
    '--bg-secondary': '#2d2d2d',
    '--bg-tertiary': '#404040',
    '--text-primary': '#ffffff',
    '--text-secondary': '#b0b0b0',
    '--text-muted': '#808080',
    '--accent': '#bb86fc',
    '--accent-hover': '#9a67ea',
    '--border': '#404040',
    '--shadow': 'rgba(0,0,0,0.3)'
  }
}

// Initialize with saved preference or default to light
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Appearance } from 'react-native'

const systemDark = Appearance.getColorScheme() === 'dark'
const initialTheme = systemDark ? 'dark' : 'light'

setDefaultVariables(themes[initialTheme])

export async function setTheme(themeName) {
  Object.assign(variables, themes[themeName])
  await AsyncStorage.setItem('theme', themeName)
}

export function toggleTheme() {
  const current = variables['--bg-primary'] === themes.dark['--bg-primary']
    ? 'dark' : 'light'
  setTheme(current === 'dark' ? 'light' : 'dark')
}
```

## Themed App Component

```jsx
// App.jsx
import { styl } from 'cssxjs'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { toggleTheme } from './theme'

function App() {
  return (
    <View styleName="app">
      <View styleName="header">
        <Text styleName="logo">My App</Text>
        <Pressable styleName="theme-toggle" onPress={toggleTheme}>
          <Text styleName="toggle-text">Toggle Theme</Text>
        </Pressable>
      </View>

      <ScrollView styleName="main">
        <View styleName="card">
          <Text styleName="card-title">Welcome</Text>
          <Text styleName="card-text">
            This card automatically updates when the theme changes.
          </Text>
        </View>
      </ScrollView>
    </View>
  )

  styl`
    .app
      flex 1
      background var(--bg-primary)

    .header
      flex-direction row
      justify-content space-between
      align-items center
      padding 16px 24px
      background var(--bg-secondary)
      border-bottom-width 1px
      border-bottom-color var(--border)

    .logo
      font-size 24px
      font-weight 600
      color var(--text-primary)

    .theme-toggle
      padding 8px 16px
      background var(--accent)
      border-radius 6px

    .toggle-text
      color white

    .main
      padding 24px

    .card
      background var(--bg-secondary)
      border-radius 12px
      padding 24px

    .card-title
      margin-bottom 12px
      color var(--text-primary)
      font-size 18px
      font-weight 600

    .card-text
      color var(--text-secondary)
      line-height 24px
  `
}
```

## Key Concepts

- **`setDefaultVariables`** for initial theme values
- **`variables` object** for runtime theme switching
- **Automatic re-renders** when variables change
- **System preference detection** with `Appearance.getColorScheme()`
- **Persistence** with AsyncStorage
