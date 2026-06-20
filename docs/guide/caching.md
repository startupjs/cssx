# Caching

CSSX caches resolved style props by default and tracks the runtime dependencies
used by each element.

## How It Works

For Babel-compiled styles, generated code calls the CSSX runtime with the
compiled sheet and the current `styleName` value. For runtime CSS strings,
`useCompiledCss()` wraps the compiled sheet in a tracked runtime object.

The resolver caches the final props object for the current inputs:

- the compiled sheet identity and content hash
- the normalized `styleName`
- local interpolation values
- the JSON hash of inline style props
- only the CSS variables and media queries that were actually used

When those inputs are unchanged, CSSX returns the same object references for
`style`, `textStyle`, `hoverStyle`, `activeStyle`, and other part style props.
That keeps React and React Native from seeing new style objects on every render.

## No Setup Required

Use `styleName` normally:

```jsx
import { styl } from 'cssxjs'
import { View, Text } from 'react-native'

function Card({ title, children }) {
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
}
```

The Babel preset inserts the runtime calls for you.

## Dependency-Aware Updates

CSSX tracks the specific runtime dependencies used by each resolved element.
Changing an unrelated variable does not invalidate that element.

```jsx
import { variables, styl } from 'cssxjs'
import { View } from 'react-native'

function ThemedCard() {
  return <View styleName="card" />

  styl`
    .card
      background var(--card-bg, white)
  `
}

variables['--card-bg'] = '#f0f0f0' // ThemedCard updates
variables['--text-color'] = 'red'  // ThemedCard does not update
```

Variable notifications are batched in a microtask. Media query updates use the
runtime dimension store and browser media listeners when available, so CSSX only
rerenders components whose committed media result changed. Web resize handling
can be configured globally through `configureCssx()`.

```jsx
import { configureCssx } from 'cssxjs'

configureCssx({
  dimensionsDebounceMs: 50
})
```

## Runtime CSS Strings

For client-generated CSS, use `useCompiledCss()` and `cssx()`. Runtime
compilation has its own API reference covering diagnostics, subscriptions, and
platform behavior: [Runtime Compilation](/api/runtime).

## Inline Style Hashing

Inline styles are deep-hashed with `JSON.stringify()`. This means callers can
write natural inline objects without manually memoizing every object:

```jsx
<View {...cssx('card', sheet, {
  style: { marginTop: spacing }
})} />
```

If the inline style values serialize to the same JSON string, the cache can
reuse the previous result.

## Template Interpolation Cache

Function-scoped `css` and `styl` templates can use JavaScript interpolation in
CSS value positions:

```jsx
function Button({ color }) {
  return <View styleName="button" />

  css`
    .button {
      background-color: ${color};
    }
  `
}
```

Each compiled template has one cache slot for its latest interpolation values.
If `color` changes, CSSX recalculates the sheet result and replaces the previous
cached variant instead of keeping every historical value combination.

## Next Steps

- [CSS Variables](/guide/variables) - Runtime theming
- [Runtime Compilation](/api/runtime) - Generated CSS strings
- [css Template](/api/css) - Plain CSS templates and interpolation
- [Animations](/guide/animations) - Reanimated v4 output
