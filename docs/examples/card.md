# Card with Parts

A customizable card component using the `part` system for external styling.

```jsx
import { styl } from 'cssxjs'
import { View, Text } from 'react-native'

function Card({ title, subtitle, children, actions }) {
  return (
    <View part="root" styleName="root">
      <View part="header" styleName="header">
        <Text part="title" styleName="title">{title}</Text>
        {subtitle && (
          <Text part="subtitle" styleName="subtitle">{subtitle}</Text>
        )}
      </View>

      <View part="content" styleName="content">
        {children}
      </View>

      {actions && (
        <View part="actions" styleName="actions">
          {actions}
        </View>
      )}
    </View>
  )

  styl`
    .root
      background white
      border-radius 12px
      overflow hidden

    .header
      padding 20px 20px 0

    .title
      font-size 18px
      font-weight 600
      color #333

    .subtitle
      margin-top 8px
      font-size 14px
      color #666

    .content
      padding 16px 20px

    .actions
      padding 12px 20px
      border-top-width 1px
      border-top-color #eee
      flex-direction row
      gap 8px
      justify-content flex-end
  `
}
```

## Styling from Parent

Use `:part()` selectors to customize the card from parent components:

```jsx
import { styl } from 'cssxjs'
import { View, Text, Image } from 'react-native'
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
      <Image styleName="product-image" source={{ uri: product.image }} />
      <Text styleName="description">{product.description}</Text>
    </Card>
  )

  styl`
    .product-card
      max-width 320px

      &:part(header)
        background #667eea
        padding 16px 20px

      &:part(title)
        color white

      &:part(subtitle)
        color rgba(255,255,255,0.8)
        font-size 20px
        font-weight 600

    .product-image
      width 100%
      height 180px
      border-radius 8px

    .description
      color #666
      font-size 14px
      line-height 22px
  `
}
```

## Key Concepts

- **`part` attribute** exposes elements for external styling
- **`:part()` selector** targets parts from parent components
- **Encapsulation** — Card defines structure, parent customizes appearance
