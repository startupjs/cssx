# CSS Variables API

CSSX provides a reactive system for CSS variables that works at runtime.

## variables

A reactive object for setting CSS variable values at runtime. Assigning values
triggers automatic re-renders in components using those variables.

**Type:** `CssxVariableStore`

```jsx
import { variables } from 'cssxjs'

// Set a variable
variables['--primary-color'] = '#007bff'

// Read a variable
console.log(variables['--primary-color'])

// Merge multiple variables
variables.assign({
  '--primary-color': '#007bff',
  '--text-color': '#333'
})

// Replace the whole runtime variable set
variables.set({
  '--primary-color': '#007bff'
})

// Clear all runtime variables
variables.clear()
```

Only valid CSS custom property names can be assigned. Names must start with
`--`; invalid names throw.

**Reactivity:**
When you assign to `variables`, components that used those specific variables in
their resolved styles automatically re-render with the new values.

```jsx
import { Pressable, Text } from 'react-native'

function ThemeToggle() {
  const toggleDark = () => {
    variables['--bg-color'] = '#1a1a1a'
    variables['--text-color'] = '#ffffff'
    // All components using these variables re-render
  }

  return (
    <Pressable onPress={toggleDark}>
      <Text>Dark Mode</Text>
    </Pressable>
  )
}
```

---

## setDefaultVariables

Sets default values for CSS variables at app startup. These values are used as fallbacks when runtime values aren't set.

**Signature:**
```ts
function setDefaultVariables(vars: Record<string, string>): void
```

**Parameters:**
- `vars` - Object mapping variable names to their default values

**Example:**

```jsx
import { setDefaultVariables } from 'cssxjs'

// Call early in app initialization (e.g., App.jsx or index.js)
setDefaultVariables({
  '--primary-color': '#007bff',
  '--secondary-color': '#6c757d',
  '--text-color': '#333',
  '--background-color': '#fff',
  '--border-radius': '8px',
  '--spacing-sm': '8px',
  '--spacing-md': '16px',
  '--spacing-lg': '24px'
})
```

---

## defaultVariables

A reactive object containing default variable values. It supports the same
`.assign()`, `.set()`, and `.clear()` methods as `variables`.

**Type:** `CssxVariableStore`

```jsx
import { defaultVariables } from 'cssxjs'

console.log(defaultVariables['--primary-color']) // '#007bff'
```

`setDefaultVariables(vars)` is an alias for `defaultVariables.set(vars)`.

## Reading Variables In Components

Use `useCssVariable()` when JavaScript needs the resolved value:

```jsx
import { useCssVariable } from 'cssxjs'

function Box() {
  const gap = useCssVariable('--gap', '2u') // 16
  return <View style={{ gap }} />
}
```

`useCssVariable()` subscribes only to the variables it resolves, including nested
`var()` references. It returns RN-friendly values: `2u` and `16px` become
numbers, percentages remain strings, and modern color functions are normalized.

Use `useCssVariableRaw()` to read raw resolved CSS text. Outside React, use
`getCssVariable()` and `getCssVariableRaw()` for global variables only.

## Variable Resolution Order

CSS variables resolve in this priority (highest first):

1. **Template interpolation values**
2. **Runtime:** `variables['--name']`
3. **Nearest provider `:root` variable**
4. **Outer provider `:root` variables**
5. **Default:** `defaultVariables['--name']`
6. **Inline fallback:** `var(--name, fallback)`

```jsx
setDefaultVariables({ '--color': 'blue' })
variables['--color'] = 'red' // wins over provider and defaults

styl`
  .box
    color var(--color, green) // Will be 'red'
`
```

`var()` supports nested fallbacks and complex CSS values:

```stylus
.card
  box-shadow var(--card-shadow, 0 4px 12px rgba(0, 0, 0, 0.16))
  border var(--border-width, 1px) solid var(--border-color, #ddd)
```
