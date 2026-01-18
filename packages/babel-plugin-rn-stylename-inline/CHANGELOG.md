# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.2.30](https://github.com/startupjs/startupjs/compare/v0.2.29...v0.2.30) (2026-01-18)

**Note:** Version bump only for package @cssxjs/babel-plugin-rn-stylename-inline





## [0.2.29](https://github.com/startupjs/startupjs/compare/v0.2.28...v0.2.29) (2025-12-26)

**Note:** Version bump only for package @cssxjs/babel-plugin-rn-stylename-inline





## [0.2.28](https://github.com/startupjs/startupjs/compare/v0.2.27...v0.2.28) (2025-12-16)


### Bug Fixes

* **babel-plugin-rn-stylename-to-style:** re-crawl the whole Program to update bindings correctly ([3e72af1](https://github.com/startupjs/startupjs/commit/3e72af1846ec33da6e158182e5fbb19614d81da8))





## [0.2.27](https://github.com/startupjs/startupjs/compare/v0.2.26...v0.2.27) (2025-12-16)

**Note:** Version bump only for package @cssxjs/babel-plugin-rn-stylename-inline





# v0.2.16 (Sun Nov 09 2025)

#### 🚀 Enhancement

- feat(babel-plugin-rn-stylename-to-style): Support compiling css file imports in Babel itself ([@cray0000](https://github.com/cray0000))

#### Authors: 1

- Pavel Zhukov ([@cray0000](https://github.com/cray0000))

---

# v0.2.13 (Sat Nov 08 2025)

#### 🐛 Bug Fix

- fix(babel-plugin-rn-stylename-to-style): more strict check for compilers used in the file ([@cray0000](https://github.com/cray0000))

#### Authors: 1

- Pavel Zhukov ([@cray0000](https://github.com/cray0000))

---

# v0.2.12 (Fri Nov 07 2025)

#### 🚀 Enhancement

- feat(babel-plugin-rn-stylename-inline): infer platform dynamically from Metro options ([@cray0000](https://github.com/cray0000))

#### Authors: 1

- Pavel Zhukov ([@cray0000](https://github.com/cray0000))

---

# v0.2.7 (Wed Nov 05 2025)

#### 🐛 Bug Fix

- fix: move css and styl loaders into a separate package @cssxjs/loaders ([@cray0000](https://github.com/cray0000))

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
- feat: make it work for pure web through a babel plugin [#2](https://github.com/startupjs/cssx/pull/2) ([@cray0000](https://github.com/cray0000))
- feat: move over styles-related packages from startupjs ([@cray0000](https://github.com/cray0000))

#### 🐛 Bug Fix

- fix(babel-plugin-rn-stylename-to-stylename-inline): fix import aliases support, update tests ([@cray0000](https://github.com/cray0000))

#### Authors: 1

- Pavel Zhukov ([@cray0000](https://github.com/cray0000))
