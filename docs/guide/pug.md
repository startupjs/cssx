# Pug Templates (Optional)

CSSX includes optional support for [Pug](https://pugjs.org/) syntax as an alternative to JSX. This is entirely optional — you can use CSSX with standard JSX without ever touching Pug.

When you do use Pug, prefer putting local component styles inside the `pug` template with a terminal `style(lang='styl')` block. Use `style` without `lang` when you want plain CSS.

## Why Pug?

Pug offers a more concise, indentation-based syntax that some developers find cleaner than JSX:

```jsx
// JSX
<View styleName="container">
  <View styleName="header">
    <Text styleName="title">Hello</Text>
  </View>
  <View styleName="content">
    {children}
  </View>
</View>

// Pug
View.container
  View.header
    Text.title Hello
  View.content
    = children
```

## Basic Syntax

Import `pug` and use it as a template literal:

```jsx
import { pug } from 'cssxjs'
import { View, Text } from 'react-native'

function Card({ title, children }) {
  return pug`
    View.card
      View.header
        Text.title= title
      View.content
        = children

    style(lang='styl')
      .card
        background white
        border-radius 8px
      .header
        padding 16px
        border-bottom-width 1px
        border-bottom-color #eee
      .title
        font-size 18px
      .content
        padding 16px
  `
}
```

CSSX moves the `style(lang='styl')` block into a local `styl` template at build time, so `styleName`, `part`, variables, and media queries work the same way as they do in standalone `styl` templates.

## Embedded Styles

Use `style(lang='styl')` for Stylus:

```jsx
return pug`
  Pressable.button(onPress=onPress)
    Text.text= children

  style(lang='styl')
    .button
      padding 12px 16px
      border-radius 6px
      background #1677ff
    .text
      color white
`
```

Use `style` for plain CSS:

```jsx
return pug`
  View.card
    Text.title CSS syntax

  style
    .card {
      padding: 16px;
      border-radius: 8px;
      background: white;
    }

    .title {
      font-size: 18px;
    }
`
```

The embedded `style` block must be the last top-level node in the `pug` template. For JSX components or truly shared module-level styles, standalone `styl` and `css` template literals are still supported.

## TypeScript in Pug

Pug templates in TSX files support TypeScript expressions. Use `npx cssxjs check` for Pug-aware type checks, because `tsc --noEmit` does not type-check expressions inside Pug template strings.

See [TypeScript Support](/guide/typescript) for the full guide.

## Pug + CSSX Integration

### Class Names -> styleName

In Pug, class names (`.className`) automatically become the `styleName` prop:

```jsx
// Pug
View.button.primary

// Compiles to JSX
<View styleName="button primary" />
```

### Dynamic Classes

Use `.button` for the static base class and `styleName` only for dynamic classes or modifiers:

```jsx
View.button(styleName=[variant, { active, disabled }])

// Compiles to JSX
<View styleName={['button', variant, { active, disabled }]} />
```

Or object syntax only:

```jsx
View.button(styleName={ active, disabled })

// Compiles to JSX
<View styleName={['button', { active, disabled }]} />
```

## Attributes

Pass attributes in parentheses:

```jsx
// Static attributes
Pressable.btn(disabled)
  Text Submit

// Dynamic attributes
TextInput.input(value=inputValue onChangeText=handleChange)

// Spread props
View.wrapper(...props)

// Part attribute for CSSX
View.root(part="root")
```

## Content and Interpolation

### Text Content

Use `=` for interpolated text or plain text after the tag:

```jsx
Text.title= title              // Variable interpolation
Text.text Hello World          // Static text
Text.count #{count} items      // Inline interpolation with #{}
```

### Children

Use `= children` to render child content:

```jsx
function Wrapper({ children }) {
  return pug`
    View.wrapper
      = children
  `
}
```

### Conditional Rendering

```jsx
pug`
  View.container
    if isLoggedIn
      Text.user= userName
    else
      Pressable.login
        Text Login
`
```

### Loops

```jsx
pug`
  View.list
    each item in items
      View.item(key=item.id)
        Text= item.name
`
```

## Components

Use PascalCase for components:

```jsx
import { pug } from 'cssxjs'
import { View, Text } from 'react-native'
import { Card } from './Card'
import { Button } from './Button'

function App() {
  return pug`
    View.app
      Card.featured(title="Welcome")
        Text This is the content
        Button.primary(onPress=handlePress) Click Me
  `
}
```

## Complete Example

```jsx
import { pug } from 'cssxjs'
import { View, Text, Image, Pressable } from 'react-native'

function UserProfile({ user, isOnline, onLogout }) {
  return pug`
    View.root(part="root")
      View.header(part="header")
        Image.avatar(source={ uri: user.avatar })
        View.info
          Text.name= user.name
          if isOnline
            Text.status.online Online
          else
            Text.status.offline Offline

      View.content(part="content")
        Text.bio= user.bio

      View.actions
        Pressable.button.secondary(onPress=onLogout)
          Text.buttonText Logout

    style(lang='styl')
      .root
        background white
        border-radius 12px
        overflow hidden

      .header
        flex-direction row
        align-items center
        gap 16px
        padding 20px
        background #667eea

      .avatar
        width 64px
        height 64px
        border-radius 32px
        border-width 3px
        border-color white

      .info
        flex 1

      .name
        font-size 20px
        color white

      .status
        font-size 12px
        padding 2px 8px
        border-radius 10px
        overflow hidden
        &.online
          background #4caf50
          color white
        &.offline
          background #9e9e9e
          color white

      .content
        padding 20px

      .bio
        color #666
        line-height 22px

      .actions
        padding 16px 20px
        border-top-width 1px
        border-top-color #eee

      .button
        padding 8px 16px
        border-radius 6px
        &.secondary
          background #f5f5f5

      .buttonText
        color #333
  `
}
```

## Pug vs JSX Comparison

| Feature | JSX | Pug |
|---------|-----|-----|
| Syntax | XML-like with closing tags | Indentation-based, no closing tags |
| Class names | `styleName="a b"` | `.a.b` |
| Attributes | `prop={value}` | `(prop=value)` |
| Text content | `<Text>{text}</Text>` | `Text= text` |
| Conditionals | `{condition && <View />}` | `if condition` + indented block |
| Loops | `{items.map(item => ...)}` | `each item in items` |
| Local styles | `styl` after JSX | terminal `style(lang='styl')` |

## Disabling Pug

If you don't use Pug, disable it in your Babel config for faster builds:

```js
// babel.config.js
['cssxjs/babel', {
  transformPug: false
}]
```

## Next Steps

- [TypeScript Support](/guide/typescript) — Type-check Pug templates
- [Animations](/guide/animations) — CSS transitions and keyframes
- [Caching](/guide/caching) — Performance optimization
- [Examples](/examples/) — More code examples
