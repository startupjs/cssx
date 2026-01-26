# JSX Props

CSSX extends JSX with custom props for styling.

## styleName

Apply class-based styles to an element. Works like `className` but with scoped, processed styles.

```jsx
<div styleName="card featured">Content</div>
```

**Syntax Options:**

```jsx
// String — simple static class
<div styleName="card" />

// Array with object — recommended for dynamic classes
<div styleName={['card', variant, { active, disabled }]} />
```

### Array Pattern (Recommended)

Use arrays with an object at the end for modifiers:

```jsx
function Card({ variant, highlighted, compact }) {
  return (
    <div styleName={['card', variant, { highlighted, compact }]}>
      Content
    </div>
  )

  styl`
    .card
      background white
      border 1px solid #ddd
      padding 16px
    .card.featured
      border 2px solid gold
    .card.highlighted
      box-shadow 0 0 10px gold
    .card.compact
      padding 8px
  `
}
```

The pattern:
- Static base classes first (`'card'`)
- Dynamic variant strings next (`variant` — could be `'featured'`, `'simple'`, etc.)
- Boolean modifiers in an object at the end (`{ highlighted, compact }`)

**Tip:** Name variables to match class names for clean shorthand: `{ active }` instead of `{ active: isActive }`.

### Dynamic Styles

For truly dynamic values, combine `styleName` with the `style` prop:

```jsx
function ProgressBar({ progress }) {
  return (
    <div styleName="bar" style={{ width: `${progress}%` }}>
      {progress}%
    </div>
  )

  styl`
    .bar
      height 20px
      background-color #4caf50
      transition width 0.3s
  `
}
```

---

## part

Expose an element for external styling via `::part()`.

```jsx
function Button({ children }) {
  return (
    <button part="root" styleName="button">
      <span part="icon">★</span>
      <span part="text">{children}</span>
    </button>
  )
}
```

The Babel transform automatically injects the part style props — no manual prop spreading needed.

Parent components can then style these parts:

```jsx
styl`
  .my-button::part(icon)
    color gold
  .my-button::part(text)
    font-weight bold
`
```

### How Parts Work

1. Child component marks elements with `part="name"`
2. Parent uses `::part(name)` selector to target those elements
3. Babel transforms both sides to connect them automatically

See the [Component Parts guide](/guide/component-parts) for detailed examples.

---

## matcher

The internal function that matches `styleName` values against compiled styles. Advanced use only.

**Signature:**
```ts
function matcher(
  styleName: string,
  fileStyles: object,
  globalStyles: object,
  localStyles: object,
  inlineStyleProps: object
): object
```

**Parameters:**
- `styleName` - Space-separated class names (supports classnames-like syntax)
- `fileStyles` - Styles from the imported CSS file
- `globalStyles` - Module-level `styl` styles
- `localStyles` - Function-level `styl` styles
- `inlineStyleProps` - Inline style overrides

**Returns:** An object with style props, including `style` and any `{part}Style` props.
