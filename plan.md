# Backlog

Completed design notes from the CSSX unification and theming work now live in
`architecture.md`. Keep this file only for future work that is not yet part of
the implemented architecture.

## Tailwind Runtime Utilities

CSSX ships Tailwind-compatible theme variables through
`cssxjs/themes/tailwind`, but it does not yet ship a full Tailwind utility
runtime.

Future work:

- Add an optional export, likely `cssxjs/tailwind`, that can generate or resolve
  Tailwind-style utility classes without bundling it for users who never import
  it.
- Keep StartupJS UI independent from the Tailwind utility runtime. StartupJS UI
  should keep using CSS variables and semantic component CSS, not utility class
  internals.
- Reuse a proven small implementation where possible, or isolate the custom
  class parser behind a narrow adapter so CSSX does not become responsible for
  the whole Tailwind language surface by accident.
- Ensure generated utilities interoperate with CSSX variables, especially
  `--color-*`, `--spacing`, radii, font sizes, breakpoints, and arbitrary
  bracket values such as `w-[15px]`.
- Add tests for cache identity, dynamic variables, arbitrary values, web and
  React Native output parity, and package tree-shaking.

## Legacy Cleanup

- Remove compatibility-only `cache: 'teamplay'` behavior after downstream
  projects no longer pass it.
- Remove legacy runtime wrappers or import aliases only after the StartupJS and
  StartupJS UI breaking migrations are complete.
- Keep separate `.cssx.css` and `.styl` support working while projects migrate
  toward inline `css`/`styl` templates.

## CSS Surface Expansion

- Add more CSS functions only when a real component or app migration needs them.
  Current color work centers on CSS variables, `calc()`, `oklch()`, and
  `color-mix()`.
- Broaden transform tests before adding large parser features. CSSX should stay
  lightweight enough for runtime compilation on the client.
