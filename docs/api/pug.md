# pug Template

The `pug` template literal lets you write JSX using [Pug](https://pugjs.org/) syntax. This is optional — CSSX works great with standard JSX.

## Basic Usage

```jsx
import { pug, styl } from 'cssxjs'

function Card({ title, children }) {
  return pug`
    div.card
      h2.title= title
      div.content
        = children
  `

  styl`
    .card
      background white
      border-radius 8px
    .title
      margin 0
    .content
      padding 16px
  `
}
```

## Why Pug?

Pug offers a concise, indentation-based syntax:

```jsx
// JSX
<div className="container">
  <header className="header">
    <h1 className="title">Hello</h1>
  </header>
</div>

// Pug
div.container
  header.header
    h1.title Hello
```

## Class Names

Class names (`.className`) become the `styleName` prop:

```jsx
div.button.primary
// → <div styleName="button primary" />

div.card.featured.large
// → <div styleName="card featured large" />
```

### Dynamic Classes

```jsx
// With condition
div.button(styleName={active && 'active'})

// Object syntax
div.button(styleName={{ active, disabled }})
```

## Attributes

Pass attributes in parentheses:

```jsx
// Static
button.btn(type="submit" disabled) Submit

// Dynamic
input.input(value=inputValue onChange=handleChange)

// Spread
div.wrapper(...props)

// Part attribute
div.card(part="root")
```

## Content

### Text Content

```jsx
h1.title= title          // Variable
p.text Hello World       // Static text
span.count {count} items // Inline JS
```

### Children

```jsx
function Wrapper({ children }) {
  return pug`
    div.wrapper
      = children
  `
}
```

## Control Flow

### Conditionals

```jsx
pug`
  div.container
    if isLoggedIn
      span.user= userName
    else
      button.login Login
`
```

### Loops

```jsx
pug`
  ul.list
    each item in items
      li.item(key=item.id)= item.name
`
```

## Components

Use PascalCase for components:

```jsx
import { Card } from './Card'
import { Button } from './Button'

function App() {
  return pug`
    div.app
      Card.featured(title="Welcome")
        p This is content
        Button.primary(onClick=handleClick) Click Me
  `
}
```

## Complete Example

```jsx
import { pug, styl } from 'cssxjs'

function UserProfile({ user, isOnline, onLogout }) {
  return pug`
    div.profile(part="root")
      div.header(part="header")
        img.avatar(src=user.avatar alt=user.name)
        div.info
          h2.name= user.name
          if isOnline
            span.status.online Online
          else
            span.status.offline Offline

      div.content(part="content")
        p.bio= user.bio

      div.actions
        button.button.secondary(onClick=onLogout) Logout
  `

  styl`
    .profile
      background white
      border-radius 12px
      box-shadow 0 2px 8px rgba(0,0,0,0.1)

    .header
      display flex
      align-items center
      gap 16px
      padding 20px

    .avatar
      width 64px
      height 64px
      border-radius 50%

    .name
      margin 0
      font-size 20px

    .status
      font-size 12px
      padding 2px 8px
      border-radius 10px
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
      border-top 1px solid #eee

    .button
      padding 8px 16px
      border-radius 6px
      cursor pointer
      &.secondary
        background #f5f5f5
        color #333
  `
}
```

## Mixing JSX and Pug

You can use both in the same file:

```jsx
function App() {
  // JSX for complex logic
  const header = (
    <header>
      <Navigation items={navItems} />
    </header>
  )

  // Pug for simpler structure
  return pug`
    div.app
      = header
      main.content
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
| Text | `{text}` | `= text` |
| Conditionals | `{cond && <El />}` | `if cond` |
| Loops | `{items.map(...)}` | `each item in items` |

## See Also

- [Pug Templates Guide](/guide/pug) — Complete tutorial with more examples
- [styl Template](/api/styl) — Style your Pug components
