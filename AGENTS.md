# Agent Guide

Read this first, then use `architecture.md` for the detailed system map.

CSSX is a monorepo for a CSS-in-JS toolchain. Users write `styl`, `css`, or optional `pug` templates plus `styleName` and `part` props. Babel compiles that authoring syntax into style objects and runtime calls. The runtime matches class selectors, applies CSS variables/media queries, supports component parts, and can memoize with teamplay.

## Start Here

1. Read `docs/guide/index.md`, `docs/guide/usage.md`, and `docs/guide/component-parts.md` for the public model.
2. Read `architecture.md` before changing cross-package behavior.
3. Use the package map below to choose the smallest code area to edit.

## Package Map

- `packages/cssxjs/`: public `cssxjs` facade, CLI, wrappers, package exports.
- `packages/runtime/`: `process()`, `matcher()`, variables, dimensions, platform helpers, teamplay caching.
- `packages/loaders/`: Stylus/CSS loaders and direct compiler wrappers.
- `packages/babel-plugin-rn-stylename-inline/`: compiles inline `css` and `styl` templates.
- `packages/babel-plugin-rn-stylename-to-style/`: rewrites JSX `styleName`, `part`, old `*StyleName`, and helper calls.
- `packages/babel-preset-cssxjs/`: transform ordering and public Babel options.
- `packages/bundler/`: Metro hot-reload path for separate style files.
- `packages/eslint-plugin-cssxjs/`: wrapper around React Pug ESLint processor.
- `docs/`: user-facing docs; update these when public behavior changes.
- `example/`: web demo using Babel plus esbuild.

## Core Contracts

- `__CSS_GLOBAL__` and `__CSS_LOCAL__` connect the inline Babel plugin to the JSX/runtime plugin.
- Compiled style metadata `__hash__`, `__vars`, and `__hasMedia` connects loaders to cached and uncached runtime processing.
- Runtime calls have this shape: `runtime(styleName, fileStyles, globalStyles, localStyles, inlineStyleProps)`.
- Style priority is file styles, then global templates, then local templates, then inline props.
- Selector specificity is approximated by class count only.
- `part='root'` maps to `style`; other parts map to `{partName}Style`.
- `css`/`styl` template interpolation is intentionally unsupported.
- Cached runtime is selected by `cache: 'teamplay'` or by importing `observer` from `teamplay` or `startupjs`.

## Commands

Install dependencies with the repo package manager:

```sh
yarn install
```

Run all package tests:

```sh
yarn test
```

Run targeted tests:

```sh
cd packages/runtime && yarn test
cd packages/babel-plugin-rn-stylename-inline && yarn test
cd packages/babel-plugin-rn-stylename-to-style && yarn test
```

Run docs locally:

```sh
yarn docs
```

Run the example app:

```sh
yarn start
```

## Change Guidance

- For runtime matching changes, update `packages/runtime/test/matcher.mjs` and `packages/runtime/test/process.mjs`.
- For Babel changes, update the relevant Jest snapshots.
- For public API or behavior changes, update `docs/` and `architecture.md`.
- For Pug, type checking, or ESLint behavior, check whether the implementation lives in `@react-pug/*`; this repo often only wraps it.
- For separate style files, check both Babel `compileCssImports` behavior and Metro transformer behavior.
- Prefer current source code and `docs/` over older package READMEs when they conflict.
