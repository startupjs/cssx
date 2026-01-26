# CSS Variables API

CSSX provides a reactive system for CSS variables that works at runtime.

## variables

A reactive object for setting CSS variable values at runtime. Assigning values triggers automatic re-renders in components using those variables.

**Type:** `Observable<Record<string, string>>`

```jsx
import { variables } from 'cssxjs'

// Set a variable
variables['--primary-color'] = '#007bff'

// Read a variable
console.log(variables['--primary-color'])

// Set multiple variables
Object.assign(variables, {
  '--primary-color': '#007bff',
  '--text-color': '#333'
})
```

**Reactivity:**
When you assign to `variables`, all components using those CSS variables automatically re-render with the new values.

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

A read-only object containing the default variable values set by `setDefaultVariables`.

**Type:** `Record<string, string>`

```jsx
import { defaultVariables } from 'cssxjs'

console.log(defaultVariables['--primary-color']) // '#007bff'
```

---

## dimensions

A reactive object containing the current screen width. Used internally for media query support.

**Type:** `Observable<{ width: number }>`

```jsx
import { dimensions } from 'cssxjs'

console.log(dimensions.width) // e.g., 375
```

The `width` property automatically updates when the screen size changes, triggering re-renders in components using media queries.

---

## Variable Resolution Order

CSS variables resolve in this priority (highest first):

1. **Runtime:** `variables['--name']`
2. **Default:** `setDefaultVariables({ '--name': value })`
3. **Inline fallback:** `var(--name, fallback)`

```jsx
setDefaultVariables({ '--color': 'blue' })  // Priority 2
variables['--color'] = 'red'                 // Priority 1 (wins)

styl`
  .box
    color var(--color, green)  // Will be 'red'
`
```
