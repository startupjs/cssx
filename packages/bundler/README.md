# cssx bundler

> Compile CSSX styles in React Native and Web bundlers

## Usage

TBD

## Export from stylus and css files

We can export variables directly from stylus into js. Here is an example:

1. In `ShoppingCart/index.styl` file:

```styl
// allow overrides from global configuration
$this = merge({
  bgColor: $UI.colors.primary,
  height: 10u
}, $UI.ShoppingCart, true)

.root
  height: $this.height
  background-color: $this.bgColor

:export
  config: $this
  colors: $UI.colors
  foobar: 42
```

2. Now import variables `colors`, `config` and `foobar` in the `ShoppingCart/index.js` file:

```jsx
import STYLES from './index.styl'

const {
  config: { bgColor },
  colors,
  foobar
} = STYLES

export default function ShoppingCart () {
  console.log('Background color is:', bgColor)
  console.log('Available colors:', colors)
  console.log('Magic number FooBar:', foobar)
  return <View styleName='root' />
}
```

## MIT License

Copyright (c) 2018 Pavel Zhukov
