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

// Initialize with system preference or saved preference
const savedTheme = localStorage.getItem('theme')
const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
const initialTheme = savedTheme || (systemDark ? 'dark' : 'light')

setDefaultVariables(themes[initialTheme])

export function setTheme(themeName) {
  Object.assign(variables, themes[themeName])
  localStorage.setItem('theme', themeName)
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
import { toggleTheme } from './theme'

function App() {
  return (
    <div styleName="app">
      <header styleName="header">
        <h1 styleName="logo">My App</h1>
        <button styleName="theme-toggle" onClick={toggleTheme}>
          Toggle Theme
        </button>
      </header>

      <main styleName="main">
        <div styleName="card">
          <h2 styleName="card-title">Welcome</h2>
          <p styleName="card-text">
            This card automatically updates when the theme changes.
          </p>
        </div>
      </main>
    </div>
  )

  styl`
    .app
      min-height 100vh
      background var(--bg-primary)
      color var(--text-primary)
      transition background 0.3s, color 0.3s

    .header
      display flex
      justify-content space-between
      align-items center
      padding 16px 24px
      background var(--bg-secondary)
      border-bottom 1px solid var(--border)

    .logo
      margin 0
      font-size 24px

    .theme-toggle
      padding 8px 16px
      background var(--accent)
      color white
      border none
      border-radius 6px
      cursor pointer

    .main
      padding 24px
      max-width 800px
      margin 0 auto

    .card
      background var(--bg-secondary)
      border-radius 12px
      padding 24px
      box-shadow 0 4px 12px var(--shadow)

    .card-title
      margin 0 0 12px
      color var(--text-primary)

    .card-text
      margin 0
      color var(--text-secondary)
      line-height 1.6
  `
}
```

## Key Concepts

- **`setDefaultVariables`** for initial theme values
- **`variables` object** for runtime theme switching
- **Automatic re-renders** when variables change
- **System preference detection** with `prefers-color-scheme`
- **Persistence** with localStorage
