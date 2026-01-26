# pug Template

The `pug` template literal lets you write JSX using [Pug](https://pugjs.org/) syntax. This is optional — CSSX works great with standard JSX.

## Basic Usage

```jsx
import { pug, styl } from 'cssxjs'
import { View, Text } from 'react-native'

function Card({ title, children }) {
  return pug`
    View.card
      Text.title= title
      View.content
        = children
  `

  styl`
    .card
      background white
      border-radius 8px
    .title
      font-size 18px
    .content
      padding 16px
  `
}
```

## Why Pug?

Pug offers a concise, indentation-based syntax:

```jsx
// JSX
<View styleName="container">
  <View styleName="header">
    <Text styleName="title">Hello</Text>
  </View>
</View>

// Pug
View.container
  View.header
    Text.title Hello
```

## Class Names

Class names (`.className`) become the `styleName` prop:

```jsx
View.button.primary
// → <View styleName="button primary" />

View.card.featured.large
// → <View styleName="card featured large" />
```

### Dynamic Classes

```jsx
// Array with object for modifiers (recommended)
View.button(styleName=['button', variant, { active, disabled }])

// Object syntax
View.button(styleName={ active, disabled })
```

## Attributes

Pass attributes in parentheses:

```jsx
// Static
Pressable.btn(disabled)
  Text Submit

// Dynamic
TextInput.input(value=inputValue onChangeText=handleChange)

// Spread
View.wrapper(...props)

// Part attribute
View.root(part="root")
```

## Content

### Text Content

```jsx
Text.title= title              // Variable
Text.text Hello World          // Static text
Text.count #{count} items      // Inline interpolation
```

### Children

```jsx
function Wrapper({ children }) {
  return pug`
    View.wrapper
      = children
  `
}
```

## Control Flow

### Conditionals

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
import { View, Text } from 'react-native'
import { Card } from './Card'
import { Button } from './Button'

function App() {
  return pug`
    View.app
      Card.featured(title="Welcome")
        Text This is content
        Button.primary(onPress=handlePress) Click Me
  `
}
```

## Complete Example

```jsx
import { pug, styl } from 'cssxjs'
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
  `

  styl`
    .root
      background white
      border-radius 12px

    .header
      flex-direction row
      align-items center
      gap 16px
      padding 20px

    .avatar
      width 64px
      height 64px
      border-radius 32px

    .name
      font-size 20px

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

## Mixing JSX and Pug

You can use both in the same file:

```jsx
import { View } from 'react-native'

function App({ children }) {
  // JSX for complex logic
  const header = (
    <View>
      <Navigation items={navItems} />
    </View>
  )

  // Pug for simpler structure
  return pug`
    View.app
      = header
      View.content
        = children
  `
}
```

## Disabling Pug

If you don't use Pug, disable it for faster builds:

```js
// babel.config.js
['cssxjs/babel', {
  transformPug: false
}]
```

## Quick Reference

| Feature | JSX | Pug |
|---------|-----|-----|
| Class names | `styleName="a b"` | `.a.b` |
| Attributes | `prop={value}` | `(prop=value)` |
| Text | `<Text>{text}</Text>` | `Text= text` |
| Conditionals | `{cond && <View />}` | `if cond` |
| Loops | `{items.map(...)}` | `each item in items` |

## See Also

- [Pug Templates Guide](/guide/pug) — Complete tutorial with more examples
- [styl Template](/api/styl) — Style your Pug components
