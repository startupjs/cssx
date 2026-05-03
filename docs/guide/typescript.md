# TypeScript Support

CSSX works in TypeScript projects. Standard JSX components type-check normally with `tsc`, and Pug components support TypeScript expressions through the React Pug TypeScript language service plugin.

## Pug TypeScript Support

Pug templates in TSX files support TypeScript expressions in Pug expression positions:

- type assertions, for example `value as string`
- generic calls, for example `identity<string>(value)`
- `satisfies`
- non-null assertions, for example `item!`
- typed inline handlers
- typed `each` loops
- spread attributes with typed expressions

In practice, if an expression is valid TypeScript in a JSX expression position, it should be valid in the equivalent Pug expression position.

Example:

```tsx
import { pug } from 'cssxjs'

type PressEvent = {
  target: {
    value?: string
  }
}

type CardConfig = {
  title: string
}

function identity<T>(value: T): T {
  return value
}

function Example({ items }: { items: string[] }) {
  const maybeTitle: string | undefined = 'Typed title'
  const config = { title: 'Config title' }

  return pug`
    View.root
      Text.title= identity<string>(config.title)
      Text.subtitle= config.title satisfies CardConfig['title']

      if maybeTitle != null
        Text= maybeTitle as string

      each item in items as string[]
        Text.item(key=item)= item!

      Button(
        label='Select'
        onPress=(event: PressEvent): void => console.log(event.target.value)
      )

    style(lang='styl')
      .root
        padding 2u
      .title
        font-size 3u
        font-weight bold
      .subtitle
        color #666
      .item
        margin-top 1u
  `
}
```

## Type Checking

Use `npx cssxjs check` for project type checks when your codebase contains Pug templates.

```sh
npx cssxjs check
```

Do not rely on `tsc --noEmit` alone for Pug components. TypeScript treats the content of `` pug`...` `` as template string text, so it does not parse or type-check Pug expressions by itself.

`cssxjs check` runs the React Pug TypeScript language service plugin and maps diagnostics back to the original Pug source.

## Commands

Check the current project:

```sh
npx cssxjs check
```

Check selected files while still using the full project context:

```sh
npx cssxjs check src/App.tsx src/Button.tsx
```

Selected files must be included by the resolved `tsconfig.json`.

Resolve `tsconfig.json` from another project directory:

```sh
npx cssxjs check --project packages/web
```

Use a specific `tsconfig.json` and check selected files:

```sh
npx cssxjs check --project packages/web/tsconfig.json packages/web/src/App.tsx
```

## Options

| Option | Description |
|--------|-------------|
| `--project`, `-p` | Path to `tsconfig.json` or a directory containing it |
| `--tagFunction <name>` | Tagged template function name to recognize. Default: `pug` |
| `--injectCssxjsTypes <mode>` | CSSX React prop type injection mode: `never`, `auto`, or `force` |
| `--pretty [true|false]` | Force colorized diagnostic output on or off |

## package.json Script

Use the CSSX checker in CI:

```json
{
  "scripts": {
    "typecheck": "npx cssxjs check"
  }
}
```

If your project also contains TypeScript files that do not go through the same `tsconfig.json`, keep your existing `tsc --noEmit` script for those files and add `cssxjs check` for Pug-aware checks.

## VS Code

Install the `vscode-react-pug-tsx` extension for editor diagnostics, autocomplete, and embedded CSS/Stylus highlighting inside `pug` templates.

For Stylus highlighting inside `style(lang='styl')`, also install a Stylus language extension.
