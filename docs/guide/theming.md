# Theming

CSSX theming is built from normal CSS:

- `:root` defines scoped CSS variables for a provider subtree.
- `:root.dark` and other `:root.<theme>` blocks define named theme overrides.
- `CssxProvider style` supplies global/provider CSS.
- `CssxProvider theme` selects the active theme.
- Component tags and parts let provider CSS customize reusable components.

Most apps should prefer provider CSS variables over imperative runtime variable
mutation. Runtime variables still exist for escape hatches, but provider styles
make the theme visible, scoped, and easy to override.

## Provider Styles

Use `CssxProvider` when using CSSX directly:

```jsx
import { CssxProvider, css } from 'cssxjs'

const appStyle = css`
  :root {
    --primary: oklch(0.58 0.22 260);
    --primary-foreground: oklch(0.98 0.02 260);
    --color-primary: var(--primary);
    --color-primary-foreground: var(--primary-foreground);
  }

  Button {
    border-radius: var(--radius-md);
  }

  Button:part(text) {
    font-weight: var(--font-weight-semibold);
  }
`

export default function App () {
  return (
    <CssxProvider style={appStyle}>
      <Routes />
    </CssxProvider>
  )
}
```

`style` accepts a compiled `css` sheet, a runtime CSS string, a tracked runtime
sheet, or an array of those values. Later entries override earlier entries at
the same priority layer.

Nested providers are scoped. Inner provider variables override outer provider
variables only for the inner subtree.

## Theme Selection

`theme` controls which `:root.<theme>` block is active:

```jsx
<CssxProvider theme='auto' style={appStyle}>
  <App />
</CssxProvider>
```

Supported values:

| Value | Behavior |
| --- | --- |
| `default` | Uses only `:root`. This is the initial root preference when there is no saved user preference. |
| `auto` | Uses the OS color scheme and selects `dark` when the provider style defines `:root.dark`. |
| `light` | Alias for `default` unless `:root.light` exists. |
| `dark` | Uses `:root` plus `:root.dark`. |
| custom name | Uses `:root` plus `:root.<name>`. |

When the root `CssxProvider` does not receive a `theme` prop, CSSX uses the
persisted global preference. Without a saved preference, the root provider
starts in the `default` theme so host UI such as React Navigation does not
unexpectedly switch to dark mode. Use `useTheme()` to read and update the
preference:

```jsx
import { useTheme } from 'cssxjs'
import { Pressable, Text } from 'react-native'

function ThemeToggle () {
  const [theme, setTheme] = useTheme()
  const dark = theme === 'dark'

  return (
    <Pressable onPress={() => setTheme(dark ? 'light' : 'dark')}>
      <Text>{dark ? 'Light mode' : 'Dark mode'}</Text>
    </Pressable>
  )
}
```

CSSX stores this preference in `localStorage` on web and in
`@react-native-async-storage/async-storage` on React Native. If a provider
receives an explicit non-`auto` `theme` prop, that prop forces the theme for its
subtree; `useTheme().setTheme()` still updates the saved preference, but the
forced subtree keeps using the prop value until it changes or is removed. At
the root, `theme='auto'` uses the system color scheme as the initial preference,
then a saved or user-selected preference takes priority.

Define themes with variable-only root blocks:

```css
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
}

:root.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
}
```

Only custom properties are valid inside `:root` and `:root.<theme>` blocks.
Normal style declarations inside those blocks are ignored and reported as
diagnostics.

## Theme Assets

CSSX ships theme token assets:

```jsx
import tailwindTheme from 'cssxjs/themes/tailwind'
import shadcnTheme from 'cssxjs/themes/shadcn'
```

These are normal CSSX sheets that can be passed to `CssxProvider`:

```jsx
import { CssxProvider, css } from 'cssxjs'
import tailwindTheme from 'cssxjs/themes/tailwind'
import shadcnTheme from 'cssxjs/themes/shadcn'

const overrides = css`
  :root {
    --primary: oklch(0.56 0.22 255);
    --color-primary: var(--primary);
  }
`

function App () {
  return (
    <CssxProvider style={[tailwindTheme, shadcnTheme, overrides]}>
      <Routes />
    </CssxProvider>
  )
}
```

The public API is the entrypoint import. The source files are useful as variable
references:

- `packages/cssxjs/themes/tailwind.cssx.css`
- `packages/cssxjs/themes/shadcn.cssx.css`

Bare CSSX does not automatically install either theme. Frameworks or component
libraries can choose to layer them for their own users.

## Token Pattern

The recommended token structure is:

1. Raw scale tokens, such as Tailwind palette, spacing, font, radius, and
   breakpoint variables.
2. Semantic shadcn-style variables, such as `--primary`, `--background`, and
   `--border`.
3. Tailwind-compatible consumption variables, such as `--color-primary` and
   `--color-background`.
4. Component-specific variables, such as `--Button-radius`.

Example:

```css
:root {
  --primary: oklch(0.58 0.22 260);
  --primary-foreground: oklch(0.98 0.02 260);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);

  --Button-radius: var(--radius-md);
}
```

Component styles should usually consume `--color-*` variables. App themes should
usually override semantic variables first, then map them to `--color-*`.

## Theme-Specific Styles

Use built-in theme media aliases for normal styles that should only apply in a
specific theme:

```css
Card {
  box-shadow: var(--shadow-sm);
}

@media (--theme-dark) {
  Card {
    box-shadow: none;
    border-color: var(--color-border);
  }
}
```

`--theme-dark`, `--theme-light`, `--theme-default`, and `--theme-<name>` are
reserved by CSSX. They match the active provider theme and can compose with
ordinary media queries or custom media aliases.

## Custom Media

Provider styles can define standard `@custom-media` aliases:

```css
:root {
  --tablet: 48rem;
  --desktop: 64rem;
}

@custom-media --breakpoint-tablet (width >= var(--tablet));
@custom-media --breakpoint-desktop (width >= var(--desktop));
```

Use the aliases from component styles or provider overrides:

```css
@media (--breakpoint-tablet) {
  Button {
    min-width: 12rem;
  }
}
```

CSSX provides fallback aliases for `mobile`, `tablet`, `desktop`, and `wide`
when a provider does not define them.

## Component Tags

Use `themed(tagName, Component)` for components that should be globally
customizable by provider CSS:

```jsx
import { themed } from 'cssxjs'
import { Pressable, Text } from 'react-native'

function Button ({ children }) {
  return (
    <Pressable part='root' styleName='root'>
      <Text part='text' styleName='text'>{children}</Text>
    </Pressable>
  )

  css`
    .root {
      background-color: var(--color-primary);
    }

    .text {
      color: var(--color-primary-foreground);
    }
  `
}

export default themed('Button', Button)
```

Provider CSS can then target every themed button:

```css
Button {
  min-height: 2.5rem;
}

Button:part(text) {
  text-transform: uppercase;
}
```

Class selectors remain utility classes. Component tags are for reusable
components that explicitly opt in through `themed()`.

## Parts

`part` exposes semantic inner elements to parent/provider CSS:

```jsx
<Pressable part='root'>
  <Text part='label' />
</Pressable>
```

Mappings:

| Part | Prop |
| --- | --- |
| `root` | `style` |
| `label` | `labelStyle` |
| `icon` | `iconStyle` |

Use `:part()` or `::part()` in provider or parent CSS:

```css
Button:part(icon) {
  opacity: 0.8;
}
```

Use direct `style` and `*Style` props as per-instance escape hatches.

## Reading Theme Values In JS

Prefer CSS for visual styling. When JavaScript needs a resolved token, use the
CSSX hooks:

```jsx
import { useCssColor, useCssVariable, useMedia } from 'cssxjs'

function Avatar () {
  const online = useCssColor('success')
  const size = useCssVariable('--Avatar-size', '2.5rem')
  const media = useMedia()

  return (
    <StatusDot
      color={online}
      size={media.desktop ? size : 12}
    />
  )
}
```

`useCssColor('primary')` resolves `var(--color-primary)`. Passing
`useCssColor('primary', 0.15)` mixes the color with transparent by 15 percent.
Pass `var(--custom)` when you need an exact variable expression.

Outside React, `getCssColor()` and `getCssVariable()` read global/default
variables only. They are escape hatches and are not provider-scoped in this
batch.

## Runtime Variables

The `variables` and `defaultVariables` stores remain available for imperative
updates:

```jsx
import { variables } from 'cssxjs'

variables.assign({
  '--toast-offset': '1rem',
  '--toast-color': 'var(--color-primary)'
})
```

Use them when the value truly lives outside the provider tree or must be changed
imperatively. For app themes, prefer `CssxProvider style`.

## StartupJS

When CSSX is used through StartupJS, `StartupjsProvider style` and
`StartupjsProvider theme` forward to CSSX. Bare StartupJS does not include any
theme assets by default. Component libraries such as startupjs-ui can add their
own provider layer and still let app `StartupjsProvider style` override it.
