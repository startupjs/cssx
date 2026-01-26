# Form Components

Reusable form input with validation states.

```jsx
import { styl } from 'cssxjs'
import { useState } from 'react'
import { View, Text, TextInput } from 'react-native'

function Input({
  label,
  error,
  hint,
  value,
  onChangeText,
  placeholder,
  secureTextEntry
}) {
  const [focused, setFocused] = useState(false)
  const hasError = !!error

  return (
    <View part="root" styleName="root">
      {label && (
        <Text part="label" styleName="label">
          {label}
        </Text>
      )}

      <TextInput
        part="input"
        styleName={['input', { focused, error: hasError }]}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
      />

      {(error || hint) && (
        <Text part="message" styleName={['message', { error: hasError }]}>
          {error || hint}
        </Text>
      )}
    </View>
  )

  styl`
    .root
      gap 6px

    .label
      font-size 14px
      font-weight 500
      color #374151

    .input
      padding 10px 14px
      border-width 1px
      border-color #d1d5db
      border-radius 6px
      font-size 16px

      &.focused
        border-color #007bff

      &.error
        border-color #dc3545

    .message
      font-size 12px
      color #6b7280

      &.error
        color #dc3545
  `
}
```

## Usage

```jsx
<Input
  label="Email"
  placeholder="you@example.com"
  hint="We'll never share your email"
/>

<Input
  label="Password"
  secureTextEntry
  error="Password must be at least 8 characters"
/>
```

## Key Concepts

- **Array pattern** with boolean modifiers `['input', { focused, error: hasError }]`
- **State-based focus** — use `onFocus`/`onBlur` handlers with `&.focused` modifier
- **Modifier on each element** — add error state to children that need styling (`&.error`)
- **`part` attribute** for external customization
