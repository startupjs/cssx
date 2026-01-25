# JSX Props

CSSX extends JSX with custom props for styling.

## styleName

Apply class-based styles to an element. Works like `className` but with scoped, processed styles.

```jsx
<div styleName="card featured">Content</div>
```

**Syntax Options:**

```jsx
// String
<div styleName="card" />

// Object - keys with truthy values are included
<div styleName={{ card: true, active, highlighted }} />

// Array - falsy values are filtered out
<div styleName={['card', active && 'active']} />

// Mixed - combine arrays, strings, and objects (recommended)
<div styleName={['button', variant, { active, disabled }]} />
```

### Modifier Classes with Object/Array Syntax

The object and array syntax is cleaner than string interpolation for conditional classes. Name your variables to match the CSS class names for the cleanest syntax:

```jsx
function Card({ highlighted, compact }) {
  return (
    // Object shorthand - cleanest when variable names match class names
    <div styleName={{ card: true, highlighted, compact }}>
      Content
    </div>
  )

  styl`
    .card
      background white
      border 1px solid #ddd
      padding 16px
    .card.highlighted
      border-color gold
      box-shadow 0 0 10px gold
    .card.compact
      padding 8px
  `
}
```

Compare this to the less readable string interpolation:

```jsx
// Avoid - harder to read with multiple modifiers
<div styleName={`card ${highlighted ? 'highlighted' : ''} ${compact ? 'compact' : ''}`}>
```

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
