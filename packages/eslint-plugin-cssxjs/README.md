# eslint-plugin-cssxjs

ESLint plugin with CSSX-specific rules

## Installation

If you are in CSSX or StartupJS project and using `eslint-config-cssxjs` then you don't need to install anything.
It's already built in into that config.

## Manual installation

```sh
yarn add -D eslint eslint-plugin-cssxjs
```

Add `cssxjs` plugin in `.eslintrc.json`, disable default `no-unreachable` rule and enable all cssxjs rules:

```json
{
  "plugins": [
    // ...
    "cssxjs"
  ],
  "rules": {
    // ...
    "no-unreachable": "off",
    "cssxjs/no-unreachable": "error"
  }
}
```

## Rules

### `cssxjs/no-unreachable`

This is a copy of the `no-unreachable` rule from ESLint core, but with `styl` template literals being ignored.

ref: https://github.com/eslint/eslint/blob/main/lib/rules/no-unreachable.js

(a single new block of code is marked with a comment `// [startupjs]`)

## License

MIT
