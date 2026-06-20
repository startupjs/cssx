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

For client-generated CSS, compile the string with `useCompiledCss()` and pass the
tracked sheet to `cssx()` inline:

```jsx
import { cssx, useCompiledCss } from 'cssxjs'

function Button({ generatedCss, disabled, label }) {
  const sheet = useCompiledCss(generatedCss)

  return (
    <Div {...cssx(['root', { disabled }], sheet, {
      style: { backgroundColor: 'red' }
    })}>
      <Span {...cssx('label', sheet)}>{label}</Span>
    </Div>
  )
}
```

Runtime compilation is graceful by default. Invalid generated CSS produces an
empty or partially compiled sheet with diagnostics attached to the sheet instead
of throwing during render.

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

## Manual Runtime API

The public helpers exported from `cssxjs` are:

```ts
useCompiledCss(cssText, options?)
useCssxSheet(compiledSheet, options?)
useCssxTemplate(compiledSheet, values, options?)
cssx(styleName, sheet, inlineStyleProps?, options?)
CssxProvider
configureCssx(options)
```

Most applications only need `styleName`. Use these helpers when CSS arrives as a
runtime string or when building lower-level components that do not use Babel's
`styleName` transform.

## Next Steps

- [CSS Variables](/guide/variables) - Runtime theming
- [css Template](/api/css) - Runtime CSS and interpolation
- [Animations](/guide/animations) - Reanimated v4 output
