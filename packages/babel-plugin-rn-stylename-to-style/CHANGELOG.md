# v0.2.8 (Wed Nov 05 2025)

#### ⚠️ Pushed to `master`

- chore: add extra exports from the main cssxjs package for all babel plugins ([@cray0000](https://github.com/cray0000))

#### Authors: 1

- Pavel Zhukov ([@cray0000](https://github.com/cray0000))

---

# v0.2.1 (Tue Nov 04 2025)

#### 🐛 Bug Fix

- fix: fix the auto-removal of css, styl, pug; add explicit check that pug is imported before trying to use it ([@cray0000](https://github.com/cray0000))

#### Authors: 1

- Pavel Zhukov ([@cray0000](https://github.com/cray0000))

---

# v0.2.0 (Tue Nov 04 2025)

#### 🚀 Enhancement

- feat: refactor all babel plugins to perform early transformation of all code in Program.enter block ([@cray0000](https://github.com/cray0000))
- feat: add TypeScript support, write a more comprehensive example in TSX ([@cray0000](https://github.com/cray0000))
- feat(runtime): implement support for both React Native and pure Web ([@cray0000](https://github.com/cray0000))
- feat: make it work for pure web through a babel plugin [#2](https://github.com/startupjs/cssx/pull/2) ([@cray0000](https://github.com/cray0000))
- feat: move over styles-related packages from startupjs ([@cray0000](https://github.com/cray0000))

#### ⚠️ Pushed to `master`

- tests: create a general test command which loops through all packages and runs tests. Update tests for babel-plugin-rn-stylename-to-style ([@cray0000](https://github.com/cray0000))

#### Authors: 1

- Pavel Zhukov ([@cray0000](https://github.com/cray0000))
