import assert from 'node:assert/strict'
import { compileCss, compileCssTemplate } from '../../src/index.ts'

describe('@cssxjs/css-to-rn compiler IR', () => {
  it('compiles class selectors into canonical rules', () => {
    const sheet = compileCss(`
      .root {
        color: red;
        padding: 8px 16px;
      }
      .root.active:part(label) {
        color: var(--label-color, blue);
      }
    `, { mode: 'build', sourceIdentity: 'Button.tsx:0' })

    assert.equal(sheet.version, 1)
    assert.equal(sheet.rules.length, 2)
    assert.deepEqual(sheet.rules[0].classes, ['root'])
    assert.equal(sheet.rules[0].part, null)
    assert.equal(sheet.rules[0].specificity, 1)
    assert.equal(sheet.rules[0].declarations[0].property, 'color')
    assert.deepEqual(sheet.rules[1].classes, ['root', 'active'])
    assert.equal(sheet.rules[1].part, 'label')
    assert.deepEqual(sheet.metadata.vars, ['--label-color'])
    assert.equal(sheet.metadata.hasDynamicRuntimeDependencies, true)
    assert.match(sheet.id, /^cssx_/)
    assert.match(sheet.sourceId ?? '', /^cssx_/)
  })

  it('maps hover and active pseudos to logical part aliases', () => {
    const sheet = compileCss(`
      .root:hover { color: red; }
      .root.active:active { color: blue; }
    `, { mode: 'build' })

    assert.equal(sheet.rules[0].part, 'hover')
    assert.equal(sheet.rules[1].part, 'active')
  })

  it('keeps media conditions on matching rules', () => {
    const sheet = compileCss(`
      @media (min-width: 600px) {
        .root { width: 50vw; }
      }
    `, { mode: 'build' })

    assert.equal(sheet.rules.length, 1)
    assert.equal(sheet.rules[0].media, '@media (min-width: 600px)')
    assert.equal(sheet.metadata.hasMedia, true)
    assert.equal(sheet.metadata.hasViewportUnits, true)
  })

  it('stores keyframes as declaration IR and marks animation metadata', () => {
    const sheet = compileCss(`
      .root { animation: fade 200ms ease; }
      @keyframes fade {
        from { opacity: 0; }
        to { opacity: var(--target-opacity, 1); }
      }
    `, { mode: 'build' })

    assert.equal(sheet.metadata.hasAnimations, true)
    assert.deepEqual(sheet.metadata.vars, ['--target-opacity'])
    assert.equal(sheet.keyframes.fade.length, 2)
    assert.equal(sheet.keyframes.fade[0].selector, 'from')
    assert.equal(sheet.keyframes.fade[1].declarations[0].property, 'opacity')
  })

  it('returns structured diagnostics instead of throwing in runtime mode', () => {
    const sheet = compileCss('.root { color red; }')

    assert.equal(sheet.rules.length, 0)
    assert.equal(sheet.error?.code, 'CSS_SYNTAX_ERROR')
    assert.equal(sheet.diagnostics[0].level, 'error')
  })

  it('throws syntax diagnostics in build mode', () => {
    assert.throws(
      () => compileCss('.root { color red; }', { mode: 'build' }),
      /CSS_SYNTAX_ERROR/
    )
  })

  it('throws unsupported static declaration diagnostics in build mode', () => {
    assert.throws(
      () => compileCss('.root { width: calc(100% - 16px); }', { mode: 'build' }),
      /UNSUPPORTED_CALC/
    )
    assert.throws(
      () => compileCss('.root { transform: translate3d(1px, 2px, 3px); }', { mode: 'build' }),
      /INVALID_DECLARATION/
    )
    assert.throws(
      () => compileCss('.root { background-image: url(hero.png); }', { mode: 'build' }),
      /UNSUPPORTED_BACKGROUND_IMAGE/
    )
  })

  it('defers dynamic declarations to runtime validation in build mode', () => {
    const sheet = compileCssTemplate(`
      .root {
        width: var(--width);
        transform: var(--__cssx_dynamic_0);
      }
    `, { mode: 'build' })

    assert.equal(sheet.rules.length, 1)
    assert.equal(sheet.error, undefined)
  })

  it('warns and ignores unsupported selectors in runtime mode', () => {
    const sheet = compileCss(`
      .root .child { color: red; }
      .root { color: blue; }
    `)

    assert.equal(sheet.rules.length, 1)
    assert.equal(sheet.diagnostics[0].code, 'UNSUPPORTED_SELECTOR')
  })

  it('records interpolation slots in template mode', () => {
    const sheet = compileCssTemplate(`
      .root {
        color: var(--__cssx_dynamic_0);
        padding: var(--__cssx_dynamic_1) 2u;
      }
    `, { mode: 'build' })

    assert.equal(sheet.metadata.hasInterpolations, true)
    assert.deepEqual(sheet.rules[0].declarations[0].dynamicSlots, [0])
    assert.deepEqual(sheet.rules[0].declarations[1].dynamicSlots, [1])
  })

  it('rejects interpolation inside media queries in build mode', () => {
    assert.throws(
      () => compileCssTemplate(`
        @media (min-width: var(--__cssx_dynamic_0)) {
          .root { color: red; }
        }
      `, { mode: 'build' }),
      /UNSUPPORTED_INTERPOLATION_POSITION/
    )
  })

  it('keeps :export static-only', () => {
    const sheet = compileCss(`
      :export {
        color: red;
      }
    `, { mode: 'build' })

    assert.deepEqual(sheet.exports, { color: 'red' })
  })
})
