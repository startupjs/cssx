const assert = require('assert')
const loader = require('../cssToReactNativeLoader.js')

const output = loader.call(
  { query: { platform: 'web' }, resourcePath: 'smoke.css' },
  `
    .root { color: red; }
    .years-item { height: 36px; padding: 8px; }
    .root.active { opacity: 0.5; }
    .root:part(icon) { color: blue; }
    :export { spacing: 2u; }
  `
)

assert(output.startsWith('module.exports = '), 'loader must emit a CommonJS export')

const sheet = JSON.parse(output.replace(/^module\.exports = /, ''))

assert.equal(sheet.version, 1)
assert.equal(typeof sheet.__hash__, 'number')
assert.equal(sheet.spacing, 2)
assert.equal(sheet.root.color, 'red')
assert.equal(sheet['years-item'].height, 36)
assert.equal(sheet['years-item'].paddingTop, 8)
assert.equal(sheet['years-item'].paddingRight, 8)
assert.equal(sheet['years-item'].paddingBottom, 8)
assert.equal(sheet['years-item'].paddingLeft, 8)
assert.equal(sheet.active, undefined, 'multi-class selectors should stay rule-only')
assert.equal(sheet.icon, undefined, 'part selectors should stay rule-only')
