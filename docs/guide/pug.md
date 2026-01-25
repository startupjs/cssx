# Pug Templates (Optional)

CSSX includes optional support for [Pug](https://pugjs.org/) syntax as an alternative to JSX. This is entirely optional — you can use CSSX with standard JSX without ever touching Pug.

## Why Pug?

Pug offers a more concise, indentation-based syntax that some developers find cleaner than JSX:

```jsx
// JSX
<div className="container">
  <header className="header">
    <h1 className="title">Hello</h1>
  </header>
  <main className="content">
    {children}
  </main>
</div>

// Pug
div.container
  header.header
    h1.title Hello
  main.content
    = children
```

## Basic Syntax

Import `pug` and use it as a template literal:

```jsx
import { pug, styl } from 'cssxjs'

function Card({ title, children }) {
  return pug`
    div.card
      div.header
        h2.title= title
      div.content
        = children
  `

  styl`
    .card
      background white
      border-radius 8px
    .header
      padding 16px
      border-bottom 1px solid #eee
    .title
      margin 0
    .content
      padding 16px
  `
}
```

## Pug + CSSX Integration

### Class Names → styleName

In Pug, class names (`.className`) automatically become the `styleName` prop:

```jsx
// Pug
div.button.primary

// Compiles to JSX
<div styleName="button primary" />
```

### Multiple Classes

Chain classes together:

```jsx
div.card.featured.large
// → <div styleName="card featured large" />
```

### Dynamic Classes

Use curly braces for dynamic values:

```jsx
div.button(styleName={isActive && 'active'})
// → <div styleName={`button ${isActive && 'active'}`} />
```

Or with object syntax:

```jsx
div.button(styleName={active: isActive, disabled: isDisabled})
```

## Attributes

Pass attributes in parentheses:

```jsx
// Static attributes
button.btn(type="submit" disabled) Submit

// Dynamic attributes
input.input(value=inputValue onChange=handleChange)

// Spread props
div.wrapper(...props)

// Part attribute for CSSX
div.card(part="root")
```

## Content and Interpolation

### Text Content

Use `=` for interpolated text or plain text after the tag:

```jsx
h1.title= title          // Variable interpolation
p.text Hello World       // Static text
span.count {count} items // Curly braces for inline JS
```

### Children

Use `= children` to render child content:

```jsx
function Wrapper({ children }) {
  return pug`
    div.wrapper
      = children
  `
}
```

### Conditional Rendering

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
        p This is the content
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
      overflow hidden
      box-shadow 0 2px 8px rgba(0,0,0,0.1)

    .header
      display flex
      align-items center
      gap 16px
      padding 20px
      background linear-gradient(135deg, #667eea, #764ba2)

    .avatar
      width 64px
      height 64px
      border-radius 50%
      border 3px solid white

    .info
      color white

    .name
      margin 0
      font-size 20px

    .status
      font-size 12px
      padding 2px 8px
      border-radius 10px
      &.online
        background #4caf50
      &.offline
        background #9e9e9e

    .content
      padding 20px

    .bio
      color #666
      line-height 1.6

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

## Pug vs JSX Comparison

| Feature | JSX | Pug |
|---------|-----|-----|
| Syntax | XML-like with closing tags | Indentation-based, no closing tags |
| Class names | `className="a b"` or `styleName="a b"` | `.a.b` |
| Attributes | `prop={value}` | `(prop=value)` |
| Text content | `{text}` | `= text` |
| Conditionals | `{condition && <Element />}` | `if condition` + indented block |
| Loops | `{items.map(item => ...)}` | `each item in items` |

## Tips

### Keep Pug Simple

Pug works best for component structure. For complex logic, extract to separate functions:

```jsx
function ComplexList({ items }) {
  const renderItem = (item) => pug`
    li.item(key=item.id)
      span.name= item.name
      span.price= formatPrice(item.price)
  `

  return pug`
    ul.list
      = items.map(renderItem)
  `
}
```

### Mix JSX and Pug

You can use both in the same project or even the same file:

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

If you don't use Pug, disable it in your Babel config for faster builds:

```js
// babel.config.js
['cssxjs/babel', {
  transformPug: false
}]
```

## Next Steps

- [Caching](/guide/caching) - Performance optimization
- [API Reference](/api/cssx) - Complete API docs
- [Examples](/examples/) - More code examples
