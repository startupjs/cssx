# Button Component

A simple button with variants and sizes.

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
```

## Usage

```jsx
<Button variant="primary" size="large">Click Me</Button>
<Button variant="outline">Outline Button</Button>
<Button variant="secondary" size="small">Small</Button>
```

## Key Concepts

- **Dynamic class names** with computed property syntax `[variant]: true`
- **Compound selectors** for size variants (`.small`, `.medium`, `.large`)
- **Object shorthand** in `styleName` for cleaner conditional classes
