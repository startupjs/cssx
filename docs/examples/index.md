# Examples

Complete, copy-paste examples demonstrating CSSX features.

## Basic Button Component

A simple button with variants:

```jsx
import { styl } from 'cssxjs'

function Button({ variant = 'primary', size = 'medium', children }) {
  return (
    <button styleName={{ button: true, [variant]: true, [size]: true }}>
      {children}
    </button>
  )

  styl`
    .button
      border none
      border-radius 8px
      cursor pointer
      font-weight 600
      transition background 0.2s, transform 0.1s

    // Variants
    .primary
      background #007bff
      color white

    .secondary
      background #6c757d
      color white

    .outline
      background transparent
      border 2px solid #007bff
      color #007bff

    // Sizes
    .small
      padding 6px 12px
      font-size 12px

    .medium
      padding 10px 20px
      font-size 14px

    .large
      padding 14px 28px
      font-size 16px
  `
}

// Usage
<Button variant="primary" size="large">Click Me</Button>
<Button variant="outline">Outline Button</Button>
<Button variant="secondary" size="small">Small</Button>
```

---

## Card with Parts

A customizable card component using the `part` system:

```jsx
import { styl } from 'cssxjs'

function Card({ title, subtitle, children, actions }) {
  return (
    <div part="root" styleName="card">
      <div part="header" styleName="header">
        <h3 part="title" styleName="title">{title}</h3>
        {subtitle && (
          <p part="subtitle" styleName="subtitle">{subtitle}</p>
        )}
      </div>

      <div part="content" styleName="content">
        {children}
      </div>

      {actions && (
        <div part="actions" styleName="actions">
          {actions}
        </div>
      )}
    </div>
  )

  styl`
    .card
      background white
      border-radius 12px
      box-shadow 0 2px 8px rgba(0,0,0,0.1)
      overflow hidden

    .header
      padding 20px 20px 0

    .title
      margin 0
      font-size 18px
      font-weight 600
      color #333

    .subtitle
      margin 8px 0 0
      font-size 14px
      color #666

    .content
      padding 16px 20px

    .actions
      padding 12px 20px
      border-top 1px solid #eee
      display flex
      gap 8px
      justify-content flex-end
  `
}
```

### Styling Cards from Parent

```jsx
import { styl } from 'cssxjs'
import { Card } from './Card'
import { Button } from './Button'

function ProductCard({ product }) {
  return (
    <Card
      styleName="product-card"
      title={product.name}
      subtitle={`$${product.price}`}
      actions={
        <>
          <Button variant="outline" size="small">Details</Button>
          <Button variant="primary" size="small">Add to Cart</Button>
        </>
      }
    >
      <img styleName="product-image" src={product.image} alt={product.name} />
      <p styleName="description">{product.description}</p>
    </Card>
  )

  styl`
    .product-card
      max-width 320px

      &::part(header)
        background linear-gradient(135deg, #667eea, #764ba2)
        padding 16px 20px

      &::part(title)
        color white

      &::part(subtitle)
        color rgba(255,255,255,0.8)
        font-size 20px
        font-weight 600

    .product-image
      width 100%
      height 180px
      object-fit cover
      border-radius 8px

    .description
      color #666
      font-size 14px
      line-height 1.5
  `
}
```

---

## Theme System

Complete dark/light theme implementation:

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

---

## Responsive Layout

Layout that adapts to screen size:

```jsx
import { styl } from 'cssxjs'

function Dashboard({ sidebar, children }) {
  return (
    <div styleName="dashboard">
      <aside styleName="sidebar">
        {sidebar}
      </aside>
      <main styleName="content">
        {children}
      </main>
    </div>
  )

  styl`
    .dashboard
      display flex
      min-height 100vh

      @media (max-width: 768px)
        flex-direction column

    .sidebar
      width 250px
      background #2d3748
      color white
      padding 20px

      @media (max-width: 768px)
        width 100%
        padding 16px

    .content
      flex 1
      padding 24px
      background #f7fafc

      @media (max-width: 768px)
        padding 16px
  `
}
```

---

## Form Components

Reusable form input with validation states:

```jsx
import { styl } from 'cssxjs'

function Input({
  label,
  error,
  hint,
  ...inputProps  // native input props (type, value, onChange, etc.)
}) {
  return (
    <div part="root" styleName={{ field: true, error: !!error }}>
      {label && (
        <label part="label" styleName="label">
          {label}
        </label>
      )}

      <input part="input" styleName="input" {...inputProps} />

      {(error || hint) && (
        <span part="message" styleName="message">
          {error || hint}
        </span>
      )}
    </div>
  )

  styl`
    .field
      display flex
      flex-direction column
      gap 6px

    .label
      font-size 14px
      font-weight 500
      color #374151

    .input
      padding 10px 14px
      border 1px solid #d1d5db
      border-radius 6px
      font-size 16px
      outline none
      transition border-color 0.2s, box-shadow 0.2s

      &:focus
        border-color #007bff
        box-shadow 0 0 0 3px rgba(0,123,255,0.1)

    .message
      font-size 12px
      color #6b7280

    // Error state
    .error
      .input
        border-color #dc3545
        &:focus
          box-shadow 0 0 0 3px rgba(220,53,69,0.1)

      .message
        color #dc3545
  `
}

// Usage
<Input
  label="Email"
  type="email"
  placeholder="you@example.com"
  hint="We'll never share your email"
/>

<Input
  label="Password"
  type="password"
  error="Password must be at least 8 characters"
/>
```

---

## List with Selection

Interactive list component:

```jsx
import { styl } from 'cssxjs'
import { useState } from 'react'

function SelectableList({ items, onSelect }) {
  const [selectedId, setSelectedId] = useState(null)

  const handleSelect = (item) => {
    setSelectedId(item.id)
    onSelect?.(item)
  }

  return (
    <ul styleName="list">
      {items.map(item => (
        <li
          key={item.id}
          styleName={{ item: true, selected: selectedId === item.id }}
          onClick={() => handleSelect(item)}
        >
          <span styleName="icon">{item.icon}</span>
          <div styleName="content">
            <span styleName="title">{item.title}</span>
            <span styleName="subtitle">{item.subtitle}</span>
          </div>
          <span styleName="chevron">›</span>
        </li>
      ))}
    </ul>
  )

  styl`
    .list
      list-style none
      margin 0
      padding 0
      background white
      border-radius 12px
      overflow hidden
      box-shadow 0 1px 3px rgba(0,0,0,0.1)

    .item
      display flex
      align-items center
      gap 12px
      padding 14px 16px
      cursor pointer

      &.selected
        background #e3f2fd

    .icon
      font-size 24px
      width 40px
      height 40px
      display flex
      align-items center
      justify-content center
      background #f0f0f0
      border-radius 8px

    .content
      flex 1
      display flex
      flex-direction column
      gap 2px

    .title
      font-weight 500
      color #333

    .subtitle
      font-size 13px
      color #666

    .chevron
      color #999
      font-size 20px
  `
}

// Usage
const items = [
  { id: 1, icon: '📱', title: 'Mobile App', subtitle: 'iOS and Android' },
  { id: 2, icon: '🌐', title: 'Web App', subtitle: 'React + TypeScript' },
  { id: 3, icon: '🖥️', title: 'Desktop', subtitle: 'Electron' }
]

<SelectableList items={items} onSelect={item => console.log(item)} />
```

---

## Modal Dialog

Accessible modal with backdrop:

```jsx
import { styl } from 'cssxjs'
import { useEffect } from 'react'

function Modal({ isOpen, onClose, title, children, actions }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div styleName="overlay" onClick={onClose}>
      <div
        part="root"
        styleName="modal"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <header part="header" styleName="header">
          <h2 id="modal-title" styleName="title">{title}</h2>
          <button styleName="close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div part="content" styleName="content">
          {children}
        </div>

        {actions && (
          <footer part="footer" styleName="footer">
            {actions}
          </footer>
        )}
      </div>
    </div>
  )

  styl`
    .overlay
      position fixed
      inset 0
      background rgba(0,0,0,0.5)
      display flex
      align-items center
      justify-content center
      padding 20px
      z-index 1000

    .modal
      background white
      border-radius 12px
      max-width 480px
      width 100%
      max-height 90vh
      display flex
      flex-direction column
      box-shadow 0 20px 60px rgba(0,0,0,0.3)

    .header
      display flex
      align-items center
      justify-content space-between
      padding 20px
      border-bottom 1px solid #eee

    .title
      margin 0
      font-size 18px

    .close
      width 32px
      height 32px
      border none
      background transparent
      font-size 24px
      cursor pointer
      color #666
      border-radius 6px

    .content
      padding 20px
      overflow-y auto

    .footer
      padding 16px 20px
      border-top 1px solid #eee
      display flex
      gap 12px
      justify-content flex-end
  `
}

// Usage
const [isOpen, setIsOpen] = useState(false)

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
  actions={
    <>
      <Button variant="outline" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button variant="primary" onClick={handleConfirm}>
        Confirm
      </Button>
    </>
  }
>
  <p>Are you sure you want to proceed with this action?</p>
</Modal>
```

---

## Navigation Tabs

Animated tab navigation:

```jsx
import { styl } from 'cssxjs'
import { useState } from 'react'

function Tabs({ tabs, defaultTab }) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id)

  const activeContent = tabs.find(t => t.id === activeTab)?.content

  return (
    <div styleName="tabs">
      <div styleName="tab-list" role="tablist">
        {tabs.map(tab => (
          <button
            key={tab.id}
            styleName={{ tab: true, active: activeTab === tab.id }}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
          >
            {tab.icon && <span styleName="tab-icon">{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </div>

      <div styleName="tab-panel" role="tabpanel">
        {activeContent}
      </div>
    </div>
  )

  styl`
    .tabs
      background white
      border-radius 12px
      overflow hidden

    .tab-list
      display flex
      border-bottom 2px solid #eee
      background #fafafa

    .tab
      flex 1
      padding 14px 20px
      border none
      background transparent
      font-size 14px
      font-weight 500
      color #666
      cursor pointer
      display flex
      align-items center
      justify-content center
      gap 8px
      position relative

      &.active
        color #007bff

        &::after
          content ''
          position absolute
          bottom -2px
          left 0
          right 0
          height 2px
          background #007bff

    .tab-icon
      font-size 16px

    .tab-panel
      padding 20px
  `
}

// Usage
const tabs = [
  { id: 'overview', label: 'Overview', icon: '📊', content: <Overview /> },
  { id: 'analytics', label: 'Analytics', icon: '📈', content: <Analytics /> },
  { id: 'settings', label: 'Settings', icon: '⚙️', content: <Settings /> }
]

<Tabs tabs={tabs} defaultTab="overview" />
```

---

## Next Steps

- [Installation](/guide/installation) - Get started with CSSX
- [Usage Guide](/guide/usage) - Learn the basics
- [API Reference](/api/cssx) - Complete API documentation
