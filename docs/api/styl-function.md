# styl() Function

The `styl()` function is an alternative to the `styleName` prop that returns props to spread onto a component.

## When to Use

Use `styl()` instead of `styleName` when you need to:
- Pass inline `style` alongside class-based styles
- Pass part styles (like `titleStyle`, `iconStyle`) to child components
- Spread props onto a component that doesn't support `styleName` directly

## Signature

```ts
function styl(
  styleName: string | array | object,
  inlineStyles?: { style?: object, [partName]Style?: object }
): object
```

**Parameters:**
- `styleName` - Class names to apply (same syntax as the `styleName` prop)
- `inlineStyles` - Optional object with `style` and/or part styles

**Returns:** An object with `style` and any part style props, ready to spread.

## Basic Usage

```jsx
import { styl } from 'cssxjs'

function MyComponent({ variant, active }) {
  return (
    <Card {...styl('card')}>
      Content
    </Card>
  )

  styl`
    .card
      background white
      padding 16px
  `
}
```

This is equivalent to:

```jsx
<Card styleName="card">
```

## With Array/Object Syntax

The first argument supports the same syntax as `styleName`:

```jsx
// String
<Card {...styl('card')} />

// Array with object (recommended)
<Card {...styl(['card', variant, { highlighted, disabled }])} />
```

## With Inline Styles

Pass a second argument to include inline styles:

```jsx
<Card
  {...styl('card', {
    style: { marginTop: 16, marginBottom: 8 }
  })}
/>
```

The inline `style` is merged with the class-based styles, with inline styles taking priority.

## With Part Styles

When using components that expose parts, pass part styles in the second argument:

```jsx
function Parent() {
  return (
    <Card
      {...styl('card', {
        style: { margin: 16 },
        titleStyle: { color: 'red' },
        iconStyle: { size: 24 }
      })}
    />
  )

  styl`
    .card
      background white
    .card::part(title)
      font-weight bold
    .card::part(icon)
      color blue
  `
}
```

The part styles from both class selectors (`.card::part(title)`) and inline (`titleStyle`) are merged together.

## Combining with Props

A common pattern is combining `styl()` with other props:

```jsx
function MyComponent({ onPress, title, variant, disabled }) {
  return (
    <Button
      onPress={onPress}
      disabled={disabled}
      {...styl(['button', variant, { disabled }], {
        style: { marginTop: 8 }
      })}
    >
      {title}
    </Button>
  )

  styl`
    .button
      padding 12px 24px
      border-radius 8px
    .primary
      background #007bff
      color white
    .secondary
      background #6c757d
      color white
    .disabled
      opacity 0.5
  `
}
```

## Style Arrays

Both `style` and part styles support arrays:

```jsx
<Card
  {...styl('card', {
    style: [baseStyle, { color: 'blue' }, conditionalStyle],
    titleStyle: [baseTitleStyle, { fontWeight: 'bold' }]
  })}
/>
```

## Comparison with styleName

| Feature | `styleName` prop | `styl()` function |
|---------|------------------|-------------------|
| Basic usage | `<div styleName="card" />` | `<div {...styl('card')} />` |
| With inline style | `<div styleName="card" style={...} />` | `<div {...styl('card', { style: ... })} />` |
| With part styles | Requires separate props | `{...styl('card', { titleStyle: ... })}` |
| Spread syntax | Not needed | Required |

Use `styleName` for simple cases. Use `styl()` when you need to combine class-based styles with inline styles or part styles in a single expression.
