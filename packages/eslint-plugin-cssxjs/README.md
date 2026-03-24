# eslint-plugin-cssxjs

ESLint plugin with CSSX-specific rules (including Pug support)

## Installation

```sh
yarn add -D eslint@^9 eslint-plugin-cssxjs
```

Add `cssxjs` plugin to your `eslint.config.mjs` and also specify the `processor`:

```js
import { defineConfig } from 'eslint/config'
import cssxjs from 'eslint-plugin-cssxjs'

export default defineConfig([
	{
		plugins: {
			cssxjs
		},
		processor: 'cssxjs/react-pug'
	}
])
```

## Usage together with [`neostandard`](https://github.com/neostandard/neostandard)

```js
import { defineConfig } from 'eslint/config'
import neostandard, { resolveIgnoresFromGitignore } from 'neostandard'
import cssxjs from 'eslint-plugin-cssxjs'

export default defineConfig([
  ...neostandard({
		ignores: resolveIgnoresFromGitignore(),
    ts: true
  }),
	{
		plugins: {
			cssxjs
		},
		processor: 'cssxjs/react-pug'
	}
])
```

## License

MIT
