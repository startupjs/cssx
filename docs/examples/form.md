# Form Components

Reusable form input with validation states.

```jsx
import { styl } from 'cssxjs'

function Input({
  label,
  error,
  hint,
  ...inputProps  // native input props (type, value, onChange, etc.)
}) {
  return (
    <div part="root" styleName={{ field: true, error: !!error }}>
      {label && (
        <label part="label" styleName="label">
          {label}
        </label>
      )}

      <input part="input" styleName="input" {...inputProps} />

      {(error || hint) && (
        <span part="message" styleName="message">
          {error || hint}
        </span>
      )}
    </div>
  )

  styl`
    .field
      display flex
      flex-direction column
      gap 6px

    .label
      font-size 14px
      font-weight 500
      color #374151

    .input
      padding 10px 14px
      border 1px solid #d1d5db
      border-radius 6px
      font-size 16px
      outline none
      transition border-color 0.2s, box-shadow 0.2s

      &:focus
        border-color #007bff
        box-shadow 0 0 0 3px rgba(0,123,255,0.1)

    .message
      font-size 12px
      color #6b7280

    // Error state
    .error
      .input
        border-color #dc3545
        &:focus
          box-shadow 0 0 0 3px rgba(220,53,69,0.1)

      .message
        color #dc3545
  `
}
```

## Usage

```jsx
<Input
  label="Email"
  type="email"
  placeholder="you@example.com"
  hint="We'll never share your email"
/>

<Input
  label="Password"
  type="password"
  error="Password must be at least 8 characters"
/>
```

## Key Concepts

- **Conditional error class** with `{ error: !!error }`
- **Nested selectors** for error state styling (`.error .input`)
- **Focus states** with `&:focus`
- **`part` attribute** for external customization
