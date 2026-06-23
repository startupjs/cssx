import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { compileCss } from '@cssxjs/css-to-rn'
import {
  CssxProvider,
  cssx,
  getCssVariable,
  matcher,
  themed,
  useCssVariable,
  useCssxLayer,
  useRuntimeCss
} from 'cssxjs'

assert.equal(typeof CssxProvider, 'function')
assert.equal(typeof cssx, 'function')
assert.equal(typeof getCssVariable, 'function')
assert.equal(typeof matcher, 'function')
assert.equal(typeof themed, 'function')
assert.equal(typeof useCssVariable, 'function')
assert.equal(typeof useCssxLayer, 'function')
assert.equal(typeof useRuntimeCss, 'function')

assert.deepEqual(
  matcher('root active', {
    root: { color: 'red' },
    active: { opacity: 0.5 }
  }),
  [[{ color: 'red' }, { opacity: 0.5 }]]
)

assert.deepEqual(
  matcher(['root', { active: true }], {
    root: { color: 'red' },
    active: { opacity: 0.5 },
    'root:part(icon)': { color: 'blue' }
  }, undefined, undefined, {
    style: { marginTop: 4 },
    iconStyle: { marginLeft: 8 }
  }),
  {
    style: [[{ color: 'red' }, { opacity: 0.5 }], { marginTop: 4 }],
    iconStyle: [[{ color: 'blue' }], { marginLeft: 8 }]
  }
)

const packageDir = dirname(dirname(fileURLToPath(import.meta.url)))

for (const name of ['tailwind', 'shadcn']) {
  const source = readFileSync(join(packageDir, 'themes', `${name}.cssx.css`), 'utf8')
  assert.equal(source.includes('@theme'), false, `${name} theme must not use Tailwind @theme syntax`)

  const sheet = compileCss(source, { mode: 'build', sourceId: `cssxjs/themes/${name}` })
  assert.equal(sheet.error, undefined, `${name} theme should compile without fatal errors`)
  assert.deepEqual(
    sheet.diagnostics.filter(diagnostic => diagnostic.level === 'error'),
    [],
    `${name} theme should compile without errors`
  )
  assert.equal(sheet.metadata.hasVars, true, `${name} theme should expose CSS variables`)
}
