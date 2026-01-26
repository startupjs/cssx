# Caching with teamplay

CSSX can cache style computations to improve rendering performance. This is particularly useful when components re-render frequently but their styles don't change.

> **Note:** Caching currently requires the [teamplay](https://github.com/startupjs/teamplay) library. In future versions, CSSX may include built-in caching that works independently.

## How It Works

Without caching, CSSX computes styles on every render:

```jsx
import { View, Text } from 'react-native'

function Card({ title }) {
  // Style computation runs on EVERY render
  return (
    <View styleName="card">
      <Text>{title}</Text>
    </View>
  )

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
import { View, Text } from 'react-native'

const Card = observer(function Card({ title, children }) {
  return (
    <View styleName="card">
      <Text styleName="title">{title}</Text>
      <View styleName="content">{children}</View>
    </View>
  )

  styl`
    .card
      padding 16px
      background white
      border-radius 8px
    .title
      font-size 18px
      margin-bottom 12px
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
import { View, Text } from 'react-native'

const ThemedCard = observer(function ThemedCard() {
  // Cache invalidates when --card-bg changes
  return (
    <View styleName="card">
      <Text>Themed content</Text>
    </View>
  )

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
import { View, Text } from 'react-native'

const ListItem = observer(function ListItem({ item, isSelected }) {
  return (
    <View styleName={['item', { selected: isSelected }]}>
      <Text styleName="name">{item.name}</Text>
      <Text styleName="price">{item.price}</Text>
    </View>
  )

  styl`
    .item
      flex-direction row
      justify-content space-between
      padding 12px 16px
      border-bottom-width 1px
      border-bottom-color #eee
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
    <View>
      {products.map(item => (
        <ListItem
          key={item.id}
          item={item}
          isSelected={item.id === selectedId}
        />
      ))}
    </View>
  )
}
```

## Using with startupjs

If you're using the [startupjs](https://github.com/startupjs/startupjs) framework, caching is automatically configured. Just import `observer` from `startupjs`:

```jsx
import { observer, styl } from 'startupjs'
import { View, Text } from 'react-native'

export default observer(function MyComponent() {
  return (
    <View styleName="box">
      <Text>Content</Text>
    </View>
  )

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
import { Pressable, Text } from 'react-native'

// Good: observer wrapper enables caching
const Button = observer(function Button({ children }) {
  return (
    <Pressable styleName="button">
      <Text styleName="text">{children}</Text>
    </Pressable>
  )
  styl`.button { padding 12px 24px } .text { color white }`
})

// Without observer: no caching, styles compute every render
function Button({ children }) {
  return (
    <Pressable styleName="button">
      <Text styleName="text">{children}</Text>
    </Pressable>
  )
  styl`.button { padding 12px 24px } .text { color white }`
}
```

## Debugging

To verify caching is working, you can check if components are using the teamplay runtime. In development, the imported runtime path will be one of:

- `cssxjs/runtime/react-native-teamplay` (React Native with caching)
- `cssxjs/runtime/web-teamplay` (Web with caching)
- `cssxjs/runtime/react-native` (React Native without caching)
- `cssxjs/runtime/web` (Web without caching)

## Next Steps

- [Examples](/examples/) - Complete component examples
- [API Reference](/api/) - Complete API documentation
