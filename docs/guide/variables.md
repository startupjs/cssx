# CSS Variables

CSSX supports standard CSS custom properties with runtime-aware resolution. Use
`var(--name)` in CSS values, provider `:root` blocks for scoped theme defaults,
and the imperative variable stores only for lower-level global overrides.

For app-wide themes, start with [Theming](/guide/theming). This page focuses on
`var()` usage, variable priority, and the imperative APIs.

## Basic Usage

Use normal CSS `var()` syntax:

```jsx
import { css } from 'cssxjs'
import { Pressable, Text } from 'react-native'

function ThemedButton ({ children }) {
  return (
    <Pressable styleName='button'>
      <Text styleName='text'>{children}</Text>
    </Pressable>
  )

  css`
    .button {
      background-color: var(--color-primary, #007bff);
      padding: var(--Button-padding, 0.75rem 1rem);
      border-radius: var(--radius-md, 0.5rem);
    }

    .text {
      color: var(--color-primary-foreground, white);
    }
  `
}
```

The second argument in `var()` is the fallback used when the variable cannot be
resolved.

## Provider Variables

Provider styles define scoped variables with `:root`:

```jsx
import { CssxProvider, css } from 'cssxjs'

const appTheme = css`
  :root {
    --primary: oklch(0.58 0.22 260);
    --primary-foreground: oklch(0.98 0.02 260);
    --color-primary: var(--primary);
    --color-primary-foreground: var(--primary-foreground);
    --Button-padding: 0.75rem 1rem;
  }

  :root.dark {
    --primary: oklch(0.72 0.16 260);
    --primary-foreground: oklch(0.145 0 0);
  }
`

export default function App () {
  return (
    <CssxProvider theme='auto' style={appTheme}>
      <Routes />
    </CssxProvider>
  )
}
```

Nested providers can override outer provider variables for their subtree.
Root/theme blocks accept only CSS custom property declarations.

## Imperative Variables

Use `variables` when a global value is controlled outside the provider tree or
must be mutated imperatively:

```jsx
import { variables } from 'cssxjs'

variables['--toast-offset'] = '1rem'

variables.assign({
  '--toast-offset': '1.5rem',
  '--toast-color': 'var(--color-primary)'
})

variables.clear(['--toast-offset'])
```

When you assign to `variables`, components that used those exact variables in
their resolved styles automatically re-render. Unrelated variable changes do
not invalidate the component.

`defaultVariables` is a lower-priority fallback store:

```jsx
import { defaultVariables, setDefaultVariables } from 'cssxjs'

defaultVariables.assign({
  '--legacy-radius': '0.5rem'
})

setDefaultVariables({
  '--legacy-gap': '1rem'
})
```

`setDefaultVariables(vars)` is a compatibility alias for
`defaultVariables.set(vars)`. Prefer provider `:root` variables for app themes.

## Variable Priority

Variables resolve in this order, from highest to lowest priority:

1. Template interpolation values used by the current style layer.
2. Runtime variables (`variables['--name']`).
3. Nearest provider `:root` variable.
4. Outer provider `:root` variables.
5. Default variables (`defaultVariables['--name']`).
6. Inline fallback (`var(--name, fallback)`).

```jsx
setDefaultVariables({ '--color': 'blue' })
variables['--color'] = 'red'
```

```css
.box {
  color: var(--color, green); /* resolves to red */
}
```

## Complex Values

Variables work inside shorthands, nested fallbacks, comma-separated chunks, and
supported CSS functions:

```css
.card {
  border: var(--border-width, 1px) solid var(--color-border, #ddd);
  box-shadow: var(--shadow-x, 0) var(--shadow-y, 0.25rem) var(--shadow-blur, 0.75rem) var(--shadow-color, rgba(0, 0, 0, 0.16));
  background-image: var(--hero-gradient, linear-gradient(0deg, white, transparent));
}
```

Nested fallbacks are supported:

```css
.text {
  color: var(--Button-text-color, var(--color-primary-foreground, white));
}
```

Cycles and unresolved variables invalidate only the containing declaration.

## Reading Variables In JS

Use `useCssVariable()` when component logic needs a resolved value:

```jsx
import { useCssVariable } from 'cssxjs'

function Avatar () {
  const size = useCssVariable('--Avatar-size', '2.5rem')
  return <View style={{ width: size, height: size }} />
}
```

`useCssVariable()` is provider-aware and subscribes only to the variables it
actually resolves, including nested `var()` dependencies. It returns
React-Native-friendly values: `16px` becomes `16`, `0.5rem` becomes `8`,
percentages remain strings, and computed colors become compatible color
strings.

Use `useCssVariableRaw()` to read the raw resolved CSS text. Outside React,
`getCssVariable()` and `getCssVariableRaw()` read global/default variables
only; they are not provider-scoped.

For colors, prefer `useCssColor()`:

```jsx
import { useCssColor } from 'cssxjs'

const primary = useCssColor('primary')
const subtlePrimary = useCssColor('primary', 0.15)
```

## Naming Tips

- Use full CSS custom property names starting with `--`.
- Use semantic names for theme tokens, such as `--primary`, `--background`,
  and `--border`.
- Use Tailwind-compatible `--color-*` variables for consumption, such as
  `--color-primary`.
- Use component prefixes for component-specific variables, such as
  `--Button-height-m` or `--TextInput-border-color-focused`.

## Next Steps

- [Theming](/guide/theming) - Provider themes, `:root.dark`, and component tags
- [Runtime CSS](/api/runtime) - Client-side CSS compilation
- [Caching](/guide/caching) - Dependency-aware style caching
