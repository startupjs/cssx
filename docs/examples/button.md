# Button Component

A simple button with variants and sizes.

```jsx
import { styl } from 'cssxjs'
import { Pressable, Text } from 'react-native'

function Button({ variant = 'primary', size = 'medium', disabled, children }) {
  return (
    <Pressable styleName={['button', variant, size, { disabled }]}>
      <Text styleName={['text', variant]}>{children}</Text>
    </Pressable>
  )

  styl`
    .button
      border-radius 8px

    // Variants
    .primary
      background #007bff

    .secondary
      background #6c757d

    .outline
      background transparent
      border-width 2px
      border-color #007bff

    // Sizes
    .small
      padding 6px 12px

    .medium
      padding 10px 20px

    .large
      padding 14px 28px

    .text
      font-weight 600
      color white

      &.outline
        color #007bff
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

- **Array pattern** `['button', variant, size, { disabled }]` — base class, variants, then boolean modifiers
- **Compound selectors** for size variants (`.small`, `.medium`, `.large`)
- **Object shorthand** `{ disabled }` for boolean modifiers
