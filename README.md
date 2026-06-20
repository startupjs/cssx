# CSSX

> CSS-in-JS with actual CSS syntax

Features:

- Write CSS inside JS files using the actual CSS syntax
- Supports both Web and React Native
- Override styles of parts of the component from the outside using [`:part()`](https://developer.mozilla.org/en-US/docs/Web/CSS/::part)
- Dynamic CSS Variables (`var(--foo-bar)`)
- Automatic styles caching (prevents unnecessary re-renderings)
- [Stylus](https://stylus-lang.com) support
- Theming
- Customizable style system based on Material Design guidelines (8px grid)

## Installation

For installation and documentation see [cssx.dev](https://cssx.dev)

## VS Code Extension

Install the following extension for full CSSX support with Pug and CSS/Stylus in `style` or `style(lang='styl')` tags:

[`vscode-react-pug-tsx`](https://marketplace.visualstudio.com/items?itemName=startupjs.vscode-react-pug-tsx)

## Credits

CSSX's unified CSS-to-React-Native compiler/runtime was inspired by and replaces
the separate roles previously handled by:

- [`css-to-react-native`](https://github.com/styled-components/css-to-react-native)
- [`css-to-react-native-transform`](https://github.com/kristerkari/css-to-react-native-transform)

The runtime and API design also benefited from studying:

- [`cssta`](https://github.com/jacobp100/cssta)
- [`teamplay`](https://github.com/startupjs/teamplay)

## License

MIT
