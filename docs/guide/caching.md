# Caching with teamplay

CSSX can cache style computations to improve rendering performance. This is particularly useful when components re-render frequently but their styles don't change.

> **Note:** Caching currently requires the [teamplay](https://github.com/startupjs/teamplay) library. In future versions, CSSX may include built-in caching that works independently.

## How It Works

Without caching, CSSX computes styles on every render:

```jsx
function Card({ title }) {
  // Style computation runs on EVERY render
  return <div styleName="card">{title}</div>

  styl`
    .card
      padding 16px
      background white
  `
}
```

With caching enabled, CSSX memoizes the results:

1. First render: computes and caches the style object
2. Subsequent renders: returns the cached result instantly
3. Cache invalidates automatically when:
   - CSS variable values change
   - Screen dimensions change (for media queries)
   - The `styleName` value changes

## Setup

### Step 1: Install teamplay

```bash
npm install teamplay
```

### Step 2: Wrap Components with observer

For caching to work, components using `styleName` must be wrapped with `observer`:

```jsx
import { observer } from 'teamplay'
import { styl } from 'cssxjs'

const Card = observer(function Card({ title, children }) {
  return (
    <div styleName="card">
      <h2 styleName="title">{title}</h2>
      <div styleName="content">{children}</div>
    </div>
  )

  styl`
    .card
      padding 16px
      background white
      border-radius 8px
    .title
      margin 0 0 12px
    .content
      color #666
  `
})
```

That's it! The Babel transform automatically detects `observer` and enables the cached runtime.

## Automatic Detection

CSSX automatically enables caching when it detects `observer` imported from:
- `teamplay`
- `startupjs`

No additional configuration is needed.

## Manual Configuration

You can force caching behavior in your Babel config:

```js
// babel.config.js
module.exports = {
  presets: [
    ['cssxjs/babel', {
      cache: 'teamplay'  // Always use teamplay caching
    }]
  ]
}
```

## What Gets Cached

The caching system stores:
- Computed style objects for each unique `styleName` combination
- Results of CSS variable substitutions
- Media query evaluations

### Cache Key Components

Each cache entry is keyed by:
1. The `styleName` value
2. Current CSS variable values (if styles use `var()`)
3. Current screen dimensions (if styles use media queries)
4. Any inline style props

### Automatic Invalidation

The cache invalidates when reactive dependencies change:

```jsx
import { variables } from 'cssxjs'
import { observer } from 'teamplay'

const ThemedCard = observer(function ThemedCard() {
  // Cache invalidates when --card-bg changes
  return <div styleName="card">Themed content</div>

  styl`
    .card
      background var(--card-bg, white)
  `
})

// Later: changing this automatically re-renders affected components
variables['--card-bg'] = '#f0f0f0'
```

## Performance Impact

Caching is most beneficial when:
- Components re-render frequently (lists, animations, form inputs)
- Styles are complex (many classes, nested selectors)
- Multiple components share the same styles

Example with a list:

```jsx
import { observer } from 'teamplay'
import { styl } from 'cssxjs'

const ListItem = observer(function ListItem({ item, isSelected }) {
  return (
    <div styleName={`item ${isSelected ? 'selected' : ''}`}>
      <span styleName="name">{item.name}</span>
      <span styleName="price">{item.price}</span>
    </div>
  )

  styl`
    .item
      display flex
      justify-content space-between
      padding 12px 16px
      border-bottom 1px solid #eee
      &.selected
        background #e3f2fd
    .name
      font-weight 500
    .price
      color #666
  `
})

// Rendering 1000 items benefits significantly from caching
function ProductList({ products, selectedId }) {
  return (
    <div>
      {products.map(item => (
        <ListItem
          key={item.id}
          item={item}
          isSelected={item.id === selectedId}
        />
      ))}
    </div>
  )
}
```

## Using with startupjs

If you're using the [startupjs](https://github.com/startupjs/startupjs) framework, caching is automatically configured. Just import `observer` from `startupjs`:

```jsx
import { observer, styl } from 'startupjs'

export default observer(function MyComponent() {
  return <div styleName="box">Content</div>

  styl`
    .box
      padding 16px
  `
})
```

## Best Practices

### Wrap All Styled Components

For consistent behavior, wrap any component that uses `styleName`:

```jsx
// Good: observer wrapper enables caching
const Button = observer(function Button({ children }) {
  return <button styleName="button">{children}</button>
  styl`.button { padding 12px 24px }`
})

// Without observer: no caching, styles compute every render
function Button({ children }) {
  return <button styleName="button">{children}</button>
  styl`.button { padding 12px 24px }`
}
```

### Keep styleName Values Stable

Avoid constructing new `styleName` strings unnecessarily:

```jsx
// Good: stable styleName
const Button = observer(function Button({ variant }) {
  return (
    <button styleName={`button ${variant}`}>
      Click
    </button>
  )
})

// Avoid: object creates new string each render
const Button = observer(function Button({ style }) {
  return (
    <button styleName={`button ${JSON.stringify(style)}`}>
      Click
    </button>
  )
})
```

## Debugging

To verify caching is working, you can check if components are using the teamplay runtime. In development, the imported runtime path will be one of:

- `cssxjs/runtime/react-native-teamplay` (React Native with caching)
- `cssxjs/runtime/web-teamplay` (Web with caching)
- `cssxjs/runtime/react-native` (React Native without caching)
- `cssxjs/runtime/web` (Web without caching)

## Next Steps

- [API Reference](/api/cssx) - Complete API documentation
- [Examples](/examples/) - More code examples
