# Theme System

Complete light/dark theme implementation using provider CSS variables and
`useTheme()`.

## Theme CSS

```jsx
// theme.js
import { css } from 'cssxjs'

export const appTheme = css`
  :root {
    --background: oklch(1 0 0);
    --foreground: oklch(0.145 0 0);
    --card: oklch(0.98 0 0);
    --card-foreground: var(--foreground);
    --primary: oklch(0.58 0.22 260);
    --primary-foreground: oklch(0.98 0.02 260);
    --border: oklch(0.9 0 0);

    --color-background: var(--background);
    --color-foreground: var(--foreground);
    --color-card: var(--card);
    --color-card-foreground: var(--card-foreground);
    --color-primary: var(--primary);
    --color-primary-foreground: var(--primary-foreground);
    --color-border: var(--border);
  }

  :root.dark {
    --background: oklch(0.145 0 0);
    --foreground: oklch(0.985 0 0);
    --card: oklch(0.205 0 0);
    --card-foreground: var(--foreground);
    --primary: oklch(0.72 0.16 260);
    --primary-foreground: oklch(0.145 0 0);
    --border: oklch(0.28 0 0);
  }
`
```

## Theme Toggle

```jsx
// ThemeToggle.jsx
import { css, useTheme } from 'cssxjs'
import { Pressable, Text } from 'react-native'

export default function ThemeToggle () {
  const [theme, setTheme] = useTheme()
  const dark = theme === 'dark'

  return (
    <Pressable styleName='themeToggle' onPress={() => setTheme(dark ? 'light' : 'dark')}>
      <Text styleName='themeToggleText'>
        {dark ? 'Light mode' : 'Dark mode'}
      </Text>
    </Pressable>
  )

  css`
    .themeToggle {
      padding: 0.5rem 1rem;
      background-color: var(--color-primary);
      border-radius: 0.5rem;
    }

    .themeToggleText {
      color: var(--color-primary-foreground);
      font-weight: 600;
    }
  `
}
```

## Themed App

```jsx
// App.jsx
import { CssxProvider, css } from 'cssxjs'
import { View, Text, ScrollView } from 'react-native'
import { appTheme } from './theme'
import ThemeToggle from './ThemeToggle'

export default function App () {
  return (
    <CssxProvider style={appTheme}>
      <View styleName='app'>
        <View styleName='header'>
          <Text styleName='logo'>My App</Text>
          <ThemeToggle />
        </View>

        <ScrollView styleName='main'>
          <View styleName='card'>
            <Text styleName='cardTitle'>Welcome</Text>
            <Text styleName='cardText'>
              This card automatically updates when the theme changes.
            </Text>
          </View>
        </ScrollView>
      </View>
    </CssxProvider>
  )

  css`
    .app {
      flex: 1;
      background-color: var(--color-background);
    }

    .header {
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      background-color: var(--color-card);
      border-bottom-width: 1px;
      border-bottom-color: var(--color-border);
    }

    .logo {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--color-foreground);
    }

    .main {
      padding: 1.5rem;
    }

    .card {
      background-color: var(--color-card);
      border-radius: 0.75rem;
      padding: 1.5rem;
    }

    .cardTitle {
      margin-bottom: 0.75rem;
      color: var(--color-card-foreground);
      font-size: 1.125rem;
      font-weight: 600;
    }

    .cardText {
      color: var(--color-card-foreground);
      line-height: 1.5rem;
    }
  `
}
```

## Key Concepts

- **Provider CSS** with `:root` and `:root.dark` defines theme variables.
- **`useTheme()`** returns `[theme, setTheme]` for toggles and settings UI.
- **Persistence** is automatic: `localStorage` on web and AsyncStorage on React Native.
- **Default startup** uses the `default` theme unless a user preference was saved.
- **`theme='auto'`** follows the OS color scheme when a `dark` theme exists and no user preference overrides it.
- **Controlled providers** can still force a subtree with `theme='dark'`, `theme='light'`, `theme='default'`, or a custom theme name.
