import assert from 'node:assert/strict'
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
