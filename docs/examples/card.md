# Card with Parts

A customizable card component using the `part` system for external styling.

```jsx
import { styl } from 'cssxjs'

function Card({ title, subtitle, children, actions }) {
  return (
    <div part="root" styleName="root">
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
    .root
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

## Styling from Parent

Use `::part()` selectors to customize the card from parent components:

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

## Key Concepts

- **`part` attribute** exposes elements for external styling
- **`::part()` selector** targets parts from parent components
- **Encapsulation** — Card defines structure, parent customizes appearance
