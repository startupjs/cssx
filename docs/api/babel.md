# Babel Configuration

CSSX uses a Babel preset to transform styles at build time.

## cssxjs/babel

The Babel preset that transforms CSSX syntax.

```js
// babel.config.js
module.exports = {
  presets: [
    ['cssxjs/babel', options]
  ]
}
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `platform` | `'web'` \| `'ios'` \| `'android'` | `'web'` | Target platform |
| `reactType` | `'react-native'` \| `'web'` | auto | React target type |
| `cache` | `'teamplay'` | auto | Caching library |
| `transformPug` | `boolean` | `true` | Enable Pug transformation |
| `transformCss` | `boolean` | `true` | Enable CSS transformation |

## Example Configuration

```js
// babel.config.js
module.exports = {
  presets: [
    ['cssxjs/babel', {
      transformPug: false,      // Disable pug if not using it
      cache: 'teamplay'         // Force teamplay caching
    }]
  ]
}
```

## Platform Detection

The `platform` option is typically set automatically based on your bundler configuration:

- **React Native / Expo**: Set via Metro bundler
- **Web**: Defaults to `'web'`

You can also set platform-specific variables in your Stylus code:

```stylus
.button
  padding 16px

  if __IOS__
    padding-top 20px  // Extra padding for iOS safe area

  if __ANDROID__
    elevation 4       // Android-specific shadow
```

## Caching

When `cache: 'teamplay'` is set (or auto-detected), the Babel transform generates code that integrates with [teamplay](https://github.com/startupjs/teamplay) for optimized style memoization.

See the [Caching guide](/guide/caching) for more details.

## What Gets Transformed

The Babel preset transforms:

1. **`styl` template literals** → Compiled style objects
2. **`css` template literals** → Compiled style objects
3. **`pug` template literals** → JSX elements (if enabled)
4. **`styleName` props** → Connected to compiled styles
5. **`part` props** → Part style injection points

### Before Transform

```jsx
function Button({ children }) {
  return (
    <button styleName="button">
      <span part="icon">★</span>
      {children}
    </button>
  )

  styl`
    .button
      padding 12px 24px
      background blue
  `
}
```

### After Transform

The Babel preset converts this into optimized runtime code that:
- Compiles Stylus to style objects at build time
- Connects `styleName` to the compiled styles
- Injects part style props automatically

## TypeScript

CSSX works with TypeScript. The `styl` and `pug` template literals are removed at compile time, so no runtime types are needed.

```tsx
import { styl } from 'cssxjs'

interface CardProps {
  title: string
  children: React.ReactNode
}

function Card({ title, children }: CardProps) {
  return (
    <div styleName="card">
      <h2 styleName="title">{title}</h2>
      {children}
    </div>
  )

  styl`
    .card
      background white
    .title
      margin 0
  `
}
```

For `styleName` prop typing, you may need to extend JSX types in your project.
