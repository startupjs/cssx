# v0.2.2 (Tue Nov 04 2025)

#### 🐛 Bug Fix

- `@cssxjs/bundler`, `@cssxjs/runtime`
  - fix: support dynamic css var() for colors ([@cray0000](https://github.com/cray0000))

#### Authors: 1

- Pavel Zhukov ([@cray0000](https://github.com/cray0000))

---

# v0.2.1 (Tue Nov 04 2025)

#### 🐛 Bug Fix

- `@cssxjs/babel-plugin-react-pug`, `@cssxjs/babel-plugin-rn-stylename-inline`, `@cssxjs/babel-plugin-rn-stylename-to-style`
  - fix: fix the auto-removal of css, styl, pug; add explicit check that pug is imported before trying to use it ([@cray0000](https://github.com/cray0000))

#### Authors: 1

- Pavel Zhukov ([@cray0000](https://github.com/cray0000))

---

# v0.2.0 (Tue Nov 04 2025)

#### 🚀 Enhancement

- `@cssxjs/babel-plugin-react-pug`, `@cssxjs/babel-plugin-rn-stylename-inline`, `@cssxjs/babel-plugin-rn-stylename-to-style`, `babel-preset-cssxjs`
  - feat: refactor all babel plugins to perform early transformation of all code in Program.enter block ([@cray0000](https://github.com/cray0000))
- `example`, `@cssxjs/babel-plugin-rn-stylename-to-style`, `cssxjs`, `@cssxjs/runtime`
  - feat: add TypeScript support, write a more comprehensive example in TSX ([@cray0000](https://github.com/cray0000))
- `@cssxjs/babel-plugin-rn-stylename-to-style`, `babel-preset-cssxjs`, `cssxjs`, `@cssxjs/runtime`
  - feat(runtime): implement support for both React Native and pure Web ([@cray0000](https://github.com/cray0000))
- `example`, `@cssxjs/babel-plugin-rn-stylename-inline`, `@cssxjs/babel-plugin-rn-stylename-to-style`, `babel-preset-cssxjs`, `@cssxjs/bundler`, `cssxjs`, `@cssxjs/runtime`
  - feat: make it work for pure web through a babel plugin [#2](https://github.com/startupjs/cssx/pull/2) ([@cray0000](https://github.com/cray0000))
- `@cssxjs/babel-plugin-rn-stylename-inline`, `@cssxjs/babel-plugin-rn-stylename-to-style`, `@cssxjs/bundler`
  - feat: move over styles-related packages from startupjs ([@cray0000](https://github.com/cray0000))

#### 🐛 Bug Fix

- `@cssxjs/babel-plugin-rn-stylename-inline`
  - fix(babel-plugin-rn-stylename-to-stylename-inline): fix import aliases support, update tests ([@cray0000](https://github.com/cray0000))

#### ⚠️ Pushed to `master`

- chore(action): change yarn install flag to immutable ([@cray0000](https://github.com/cray0000))
- chore: minor name update ([@cray0000](https://github.com/cray0000))
- tests(workflow): use forked setup-node action which supports corepack ([@cray0000](https://github.com/cray0000))
- tests: install corepack in github action ([@cray0000](https://github.com/cray0000))
- docs: update install command ([@cray0000](https://github.com/cray0000))
- `@cssxjs/babel-plugin-rn-stylename-to-style`, `@cssxjs/bundler`
  - tests: create a general test command which loops through all packages and runs tests. Update tests for babel-plugin-rn-stylename-to-style ([@cray0000](https://github.com/cray0000))

#### Authors: 1

- Pavel Zhukov ([@cray0000](https://github.com/cray0000))

---

# (Sun Oct 27 2024)

#### ⚠️ Pushed to `master`

- chore: update yarn ([@cray0000](https://github.com/cray0000))
- chore: update rspress ([@cray0000](https://github.com/cray0000))
- `cssxjs`
  - chore: up version ([@cray0000](https://github.com/cray0000))
  - chore: rename main package to cssxjs ([@cray0000](https://github.com/cray0000))
- `example`, `cssxjs`
  - chore: fix renaming ([@cray0000](https://github.com/cray0000))
  - initial ([@cray0000](https://github.com/cray0000))

#### Authors: 1

- Pavel Zhukov ([@cray0000](https://github.com/cray0000))

---

# (Sun Oct 27 2024)

#### ⚠️ Pushed to `master`

- chore: update rspress ([@cray0000](https://github.com/cray0000))
- `example`, `cssxjs`
  - chore: fix renaming ([@cray0000](https://github.com/cray0000))
  - initial ([@cray0000](https://github.com/cray0000))
- `cssxjs`
  - chore: rename main package to cssxjs ([@cray0000](https://github.com/cray0000))

#### Authors: 1

- Pavel Zhukov ([@cray0000](https://github.com/cray0000))

---

# (Sun Oct 27 2024)

#### ⚠️ Pushed to `master`

- chore: update rspress ([@cray0000](https://github.com/cray0000))
- `cssxjs`
  - chore: rename main package to cssxjs ([@cray0000](https://github.com/cray0000))
- `example`, `cssxjs`
  - initial ([@cray0000](https://github.com/cray0000))

#### Authors: 1

- Pavel Zhukov ([@cray0000](https://github.com/cray0000))
