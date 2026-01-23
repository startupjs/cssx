/* global describe, it, before, beforeEach */
import assert from 'assert'
import { createRequire } from 'module'
import { process } from '../process.js'
import { setPlatformHelpers } from '../platformHelpers/index.js'
import singletonVariables, { setDefaultVariables } from '../variables.js'

const require = createRequire(import.meta.url)
const { styl } = require('@cssxjs/loaders/compilers')

// Configure platform helpers for test environment
before(() => {
  setPlatformHelpers({
    getDimensions: () => ({ width: 1024, height: 768 }),
    getPlatform: () => 'web',
    isPureReact: () => false,
    initDimensionsUpdater: () => {}
  })
})

// Helper function to compile stylus to a style object
// The styl() compiler returns a JSON string, so we need to parse it
function compileStyl (source) {
  if (!source) return undefined
  const jsonString = styl(source, 'test.styl')
  return JSON.parse(jsonString)
}

// Helper function to compile stylus and process it through the full pipeline
function p ({ styleName, fileStyles, globalStyles, localStyles, inlineStyleProps }) {
  return process(
    styleName,
    compileStyl(fileStyles),
    compileStyl(globalStyles),
    compileStyl(localStyles),
    inlineStyleProps || {}
  )
}

// Reset variables before each test
beforeEach(() => {
  // Clear singleton variables
  for (const key of Object.keys(singletonVariables)) {
    delete singletonVariables[key]
  }
  // Reset default variables
  setDefaultVariables({})
})

// ============================================================================
// LEVEL 1: Simple tests - no var(), no @media, single selector
// Note: Stylus converts color names to hex codes (red -> #f00, blue -> #00f)
// ============================================================================
describe('Level 1: Simple styles - single selector, no variables', () => {
  it('single class with one property', () => {
    assert.deepStrictEqual(p({
      styleName: 'root',
      fileStyles: `
        .root
          color red
      `
    }), {
      style: { color: '#f00' } // Stylus converts 'red' to '#f00'
    })
  })

  it('single class with multiple properties', () => {
    assert.deepStrictEqual(p({
      styleName: 'root',
      fileStyles: `
        .root
          color red
          font-size 16px
          padding 10px
      `
    }), {
      style: {
        color: '#f00',
        fontSize: 16,
        paddingTop: 10,
        paddingRight: 10,
        paddingBottom: 10,
        paddingLeft: 10
      }
    })
  })

  it('single class with camelCase CSS properties', () => {
    assert.deepStrictEqual(p({
      styleName: 'root',
      fileStyles: `
        .root
          background-color blue
          border-radius 8px
          font-weight bold
      `
    }), {
      style: {
        backgroundColor: '#00f', // Stylus converts 'blue' to '#00f'
        borderRadius: 8,
        fontWeight: 'bold'
      }
    })
  })

  it('non-matching selector is ignored', () => {
    assert.deepStrictEqual(p({
      styleName: 'root',
      fileStyles: `
        .root
          color red
        .other
          color blue
      `
    }), {
      style: { color: '#f00' }
    })
  })

  it('empty styleName returns only inline styles', () => {
    assert.deepStrictEqual(p({
      styleName: '',
      fileStyles: `
        .root
          color red
      `,
      inlineStyleProps: {
        style: { marginLeft: 10 }
      }
    }), {
      style: { marginLeft: 10 }
    })
  })
})

// ============================================================================
// LEVEL 2: Multiple classes without variables
// ============================================================================
describe('Level 2: Multiple classes - specificity handling', () => {
  it('two classes matching single-class selectors', () => {
    assert.deepStrictEqual(p({
      styleName: 'root active',
      fileStyles: `
        .root
          color red
        .active
          opacity 0.8
      `
    }), {
      style: {
        color: '#f00',
        opacity: 0.8
      }
    })
  })

  it('compound selector has higher specificity', () => {
    assert.deepStrictEqual(p({
      styleName: 'root active',
      fileStyles: `
        .root
          color red
        .active
          color blue
        .root.active
          color green
      `
    }), {
      style: { color: '#008000' } // Stylus converts 'green' to '#008000'
    })
  })

  it('three classes with varying specificity', () => {
    assert.deepStrictEqual(p({
      styleName: 'root active card',
      fileStyles: `
        .root
          color red
        .active
          opacity 0.5
        .card
          border-radius 8px
        .root.active
          opacity 0.8
        .root.card.active
          opacity 1
      `
    }), {
      style: {
        color: '#f00',
        borderRadius: 8,
        opacity: 1
      }
    })
  })
})

// ============================================================================
// LEVEL 3: Part selectors (::part)
// ============================================================================
describe('Level 3: Part selectors', () => {
  it('simple part selector', () => {
    assert.deepStrictEqual(p({
      styleName: 'root',
      fileStyles: `
        .root
          color red
        .root::part(input)
          background-color white
      `
    }), {
      style: { color: '#f00' },
      inputStyle: { backgroundColor: '#fff' }
    })
  })

  it('multiple part selectors', () => {
    assert.deepStrictEqual(p({
      styleName: 'root',
      fileStyles: `
        .root
          color red
        .root::part(header)
          font-size 20px
        .root::part(footer)
          font-size 14px
      `
    }), {
      style: { color: '#f00' },
      headerStyle: { fontSize: 20 },
      footerStyle: { fontSize: 14 }
    })
  })

  it('part selector with compound class', () => {
    assert.deepStrictEqual(p({
      styleName: 'root active',
      fileStyles: `
        .root::part(header)
          color red
        .root.active::part(header)
          color blue
      `
    }), {
      headerStyle: { color: '#00f' }
    })
  })
})

// ============================================================================
// LEVEL 4: Single var() usage
// ============================================================================
describe('Level 4: Single var() usage', () => {
  it('var() with default value for color', () => {
    assert.deepStrictEqual(p({
      styleName: 'root',
      fileStyles: `
        .root
          color var(--primary-color, #f00)
      `
    }), {
      style: { color: '#f00' }
    })
  })

  it('var() with default numeric value for font-size', () => {
    assert.deepStrictEqual(p({
      styleName: 'root',
      fileStyles: `
        .root
          font-size var(--font-size, 16px)
      `
    }), {
      style: { fontSize: 16 }
    })
  })

  it('var() overridden by default variables', () => {
    setDefaultVariables({ '--primary-color': '#00f' })
    assert.deepStrictEqual(p({
      styleName: 'root',
      fileStyles: `
        .root
          color var(--primary-color, #f00)
      `
    }), {
      style: { color: '#00f' }
    })
  })

  it('var() overridden by singleton variables', () => {
    setDefaultVariables({ '--primary-color': '#00f' })
    singletonVariables['--primary-color'] = '#0f0'
    assert.deepStrictEqual(p({
      styleName: 'root',
      fileStyles: `
        .root
          color var(--primary-color, #f00)
      `
    }), {
      style: { color: '#0f0' }
    })
  })

  it('singleton takes precedence over default', () => {
    setDefaultVariables({ '--color': '#00f' })
    singletonVariables['--color'] = '#800080' // purple
    assert.deepStrictEqual(p({
      styleName: 'root',
      fileStyles: `
        .root
          color var(--color, #f00)
      `
    }), {
      style: { color: '#800080' }
    })
  })
})

// ============================================================================
// LEVEL 5: Multiple var() usages in same selector
// ============================================================================
describe('Level 5: Multiple var() in same selector', () => {
  it('two var() in different properties', () => {
    assert.deepStrictEqual(p({
      styleName: 'root',
      fileStyles: `
        .root
          color var(--text-color, #000)
          background-color var(--bg-color, #fff)
      `
    }), {
      style: {
        color: '#000',
        backgroundColor: '#fff'
      }
    })
  })

  it('multiple var() with mixed overrides', () => {
    setDefaultVariables({ '--text-color': '#00f' })
    singletonVariables['--bg-color'] = '#ff0'
    assert.deepStrictEqual(p({
      styleName: 'root',
      fileStyles: `
        .root
          color var(--text-color, #000)
          background-color var(--bg-color, #fff)
          border-color var(--border-color, #808080)
      `
    }), {
      style: {
        color: '#00f',
        backgroundColor: '#ff0',
        borderColor: '#808080'
      }
    })
  })

  it('three var() with numeric values', () => {
    setDefaultVariables({
      '--padding-top': '20px',
      '--margin-left': '10px'
    })
    assert.deepStrictEqual(p({
      styleName: 'root',
      fileStyles: `
        .root
          padding-top var(--padding-top, 8px)
          margin-left var(--margin-left, 4px)
          font-size var(--font-size, 4px)
      `
    }), {
      style: {
        paddingTop: 20,
        marginLeft: 10,
        fontSize: 4
      }
    })
  })
})

// ============================================================================
// LEVEL 6: var() in different selectors and parts
// ============================================================================
describe('Level 6: var() across selectors and parts', () => {
  it('var() in different class selectors', () => {
    setDefaultVariables({ '--active-opacity': '0.5' })
    assert.deepStrictEqual(p({
      styleName: 'root active',
      fileStyles: `
        .root
          color var(--color, #f00)
        .active
          opacity var(--active-opacity, 1)
      `
    }), {
      style: {
        color: '#f00',
        opacity: 0.5
      }
    })
  })

  it('var() in part selectors', () => {
    setDefaultVariables({ '--header-bg': '#00f' })
    assert.deepStrictEqual(p({
      styleName: 'root',
      fileStyles: `
        .root
          color var(--text-color, #000)
        .root::part(header)
          background-color var(--header-bg, #808080)
        .root::part(footer)
          padding-left var(--footer-padding, 10px)
      `
    }), {
      style: { color: '#000' },
      headerStyle: { backgroundColor: '#00f' },
      footerStyle: { paddingLeft: 10 }
    })
  })

  it('var() in compound selectors with parts', () => {
    singletonVariables['--active-header-bg'] = '#0f0'
    assert.deepStrictEqual(p({
      styleName: 'root active',
      fileStyles: `
        .root::part(header)
          background-color var(--header-bg, #808080)
        .root.active::part(header)
          background-color var(--active-header-bg, #f00)
      `
    }), {
      headerStyle: { backgroundColor: '#0f0' }
    })
  })
})

// ============================================================================
// LEVEL 7: @media queries
// ============================================================================
describe('Level 7: @media queries', () => {
  it('simple @media query', () => {
    const result = p({
      styleName: 'root',
      fileStyles: `
        .root
          width 100px
        @media (min-width: 768px)
          .root
            width 200px
      `
    })
    // The style should be present (either 100px or 200px depending on current screen)
    // With our test dimensions of 1024x768, min-width: 768px should match
    assert.ok(result.style)
    assert.strictEqual(result.style.width, 200)
  })

  it('@media query not matching', () => {
    const result = p({
      styleName: 'root',
      fileStyles: `
        .root
          width 100px
        @media (min-width: 1200px)
          .root
            width 200px
      `
    })
    // With our test dimensions of 1024x768, min-width: 1200px should NOT match
    assert.strictEqual(result.style.width, 100)
  })

  it('@media with var()', () => {
    setDefaultVariables({ '--desktop-width': '500px' })
    const result = p({
      styleName: 'root',
      fileStyles: `
        .root
          width var(--mobile-width, 100px)
        @media (min-width: 768px)
          .root
            width var(--desktop-width, 200px)
      `
    })
    // With test dimensions 1024x768, the media query matches
    assert.strictEqual(result.style.width, 500)
  })
})

// ============================================================================
// LEVEL 8: External, global, and local styles hierarchy
// ============================================================================
describe('Level 8: Style hierarchy (external > global > local)', () => {
  it('local overrides global overrides external', () => {
    assert.deepStrictEqual(p({
      styleName: 'root',
      fileStyles: `
        .root
          color red
          font-size 14px
      `,
      globalStyles: `
        .root
          color blue
          padding-left 10px
      `,
      localStyles: `
        .root
          color green
      `
    }), {
      style: {
        color: '#008000', // green
        fontSize: 14,
        paddingLeft: 10
      }
    })
  })

  it('var() in all style levels', () => {
    setDefaultVariables({
      '--file-color': '#f00',
      '--global-padding': '20px',
      '--local-margin': '15px'
    })
    assert.deepStrictEqual(p({
      styleName: 'root',
      fileStyles: `
        .root
          color var(--file-color, #000)
      `,
      globalStyles: `
        .root
          padding-left var(--global-padding, 10px)
      `,
      localStyles: `
        .root
          margin-left var(--local-margin, 5px)
      `
    }), {
      style: {
        color: '#f00',
        paddingLeft: 20,
        marginLeft: 15
      }
    })
  })

  it('inline styles override all', () => {
    assert.deepStrictEqual(p({
      styleName: 'root',
      fileStyles: `
        .root
          color red
      `,
      globalStyles: `
        .root
          color blue
      `,
      localStyles: `
        .root
          color green
      `,
      inlineStyleProps: {
        style: { color: 'purple' }
      }
    }), {
      style: { color: 'purple' }
    })
  })
})

// ============================================================================
// LEVEL 9: Complex combinations
// ============================================================================
describe('Level 9: Complex combinations', () => {
  it('multiple classes, parts, var(), and hierarchy', () => {
    setDefaultVariables({
      '--primary': '#00f',
      '--header-size': '24px'
    })
    singletonVariables['--active-opacity'] = '0.9'

    assert.deepStrictEqual(p({
      styleName: 'root active',
      fileStyles: `
        .root
          color var(--primary, #f00)
        .active
          opacity var(--base-opacity, 0.5)
        .root.active
          opacity var(--active-opacity, 0.8)
        .root::part(header)
          font-size var(--header-size, 16px)
      `,
      globalStyles: `
        .root
          padding-left var(--padding, 10px)
      `,
      localStyles: `
        .root
          margin-left var(--margin, 5px)
      `,
      inlineStyleProps: {
        headerStyle: { fontWeight: 'bold' }
      }
    }), {
      style: {
        color: '#00f',
        opacity: 0.9,
        paddingLeft: 10,
        marginLeft: 5
      },
      headerStyle: {
        fontSize: 24,
        fontWeight: 'bold'
      }
    })
  })

  it('var() with rgba color value', () => {
    setDefaultVariables({
      '--string-color': 'rgba(255, 0, 0, 0.5)',
      '--numeric-size': '32px'
    })
    assert.deepStrictEqual(p({
      styleName: 'root',
      fileStyles: `
        .root
          color var(--string-color, #000)
          font-size var(--numeric-size, 16px)
      `
    }), {
      style: {
        color: 'rgba(255, 0, 0, 0.5)',
        fontSize: 32
      }
    })
  })

  it('deeply nested specificity with vars', () => {
    setDefaultVariables({
      '--level1-color': '#f00',
      '--level2-color': '#00f',
      '--level3-color': '#0f0'
    })
    assert.deepStrictEqual(p({
      styleName: 'root active card',
      fileStyles: `
        .root
          color var(--level1-color, #000)
        .root.active
          color var(--level2-color, #808080)
        .root.active.card
          color var(--level3-color, #fff)
      `
    }), {
      style: { color: '#0f0' }
    })
  })

  it('parts with multiple classes and vars', () => {
    setDefaultVariables({
      '--header-bg': '#00f',
      '--active-header-bg': '#0f0',
      '--card-header-bg': '#800080'
    })
    singletonVariables['--full-header-bg'] = '#ffa500' // orange

    assert.deepStrictEqual(p({
      styleName: 'root active card',
      fileStyles: `
        .root::part(header)
          background-color var(--header-bg, #808080)
        .root.active::part(header)
          background-color var(--active-header-bg, #f00)
        .root.card::part(header)
          background-color var(--card-header-bg, #00f)
        .root.active.card::part(header)
          background-color var(--full-header-bg, #000)
      `
    }), {
      headerStyle: { backgroundColor: '#ffa500' }
    })
  })
})

// ============================================================================
// LEVEL 10: Edge cases and special values
// ============================================================================
describe('Level 10: Edge cases', () => {
  it('var() with hyphenated variable names', () => {
    setDefaultVariables({ '--my-very-long-variable-name': '#f00' })
    assert.deepStrictEqual(p({
      styleName: 'root',
      fileStyles: `
        .root
          color var(--my-very-long-variable-name, #00f)
      `
    }), {
      style: { color: '#f00' }
    })
  })

  it('var() with numeric variable names', () => {
    setDefaultVariables({ '--color-100': '#d3d3d3' })
    assert.deepStrictEqual(p({
      styleName: 'root',
      fileStyles: `
        .root
          color var(--color-100, #fff)
      `
    }), {
      style: { color: '#d3d3d3' }
    })
  })

  it('empty default in var()', () => {
    singletonVariables['--color'] = '#f00'
    assert.deepStrictEqual(p({
      styleName: 'root',
      fileStyles: `
        .root
          color var(--color)
      `
    }), {
      style: { color: '#f00' }
    })
  })

  it('u unit support (1u = 8px)', () => {
    assert.deepStrictEqual(p({
      styleName: 'root',
      fileStyles: `
        .root
          padding-left 2u
          margin-left 1.5u
      `
    }), {
      style: {
        paddingLeft: 16,
        marginLeft: 12
      }
    })
  })

  it('multiple inline style props', () => {
    assert.deepStrictEqual(p({
      styleName: 'root',
      fileStyles: `
        .root
          color red
        .root::part(header)
          font-size 20px
      `,
      inlineStyleProps: {
        style: { marginLeft: 10 },
        headerStyle: { marginTop: 5 },
        customStyle: { padding: 15 }
      }
    }), {
      style: {
        color: '#f00',
        marginLeft: 10
      },
      headerStyle: {
        fontSize: 20,
        marginTop: 5
      },
      customStyle: {
        padding: 15
      }
    })
  })

  it('var() fallback chain - singleton > default > inline default', () => {
    // Test 1: Only inline default
    assert.deepStrictEqual(p({
      styleName: 'root',
      fileStyles: `
        .root
          color var(--test-color, #f00)
      `
    }), {
      style: { color: '#f00' }
    })

    // Test 2: Default variable overrides inline default
    setDefaultVariables({ '--test-color': '#00f' })
    assert.deepStrictEqual(p({
      styleName: 'root',
      fileStyles: `
        .root
          color var(--test-color, #f00)
      `
    }), {
      style: { color: '#00f' }
    })

    // Test 3: Singleton overrides default
    singletonVariables['--test-color'] = '#0f0'
    assert.deepStrictEqual(p({
      styleName: 'root',
      fileStyles: `
        .root
          color var(--test-color, #f00)
      `
    }), {
      style: { color: '#0f0' }
    })
  })
})

// ============================================================================
// LEVEL 11: Comprehensive integration test
// ============================================================================
describe('Level 11: Full integration test', () => {
  it('kitchen sink test', () => {
    setDefaultVariables({
      '--primary-color': '#00f',
      '--secondary-color': '#808080',
      '--spacing-md': '16px',
      '--font-size-lg': '24px'
    })
    singletonVariables['--primary-color'] = '#4b0082' // indigo
    singletonVariables['--active-bg'] = 'rgba(0, 0, 255, 0.1)'

    assert.deepStrictEqual(p({
      styleName: 'button primary active',
      fileStyles: `
        .button
          padding-top var(--spacing-md, 12px)
          padding-bottom var(--spacing-md, 12px)
          padding-left var(--spacing-md, 12px)
          padding-right var(--spacing-md, 12px)
          border-radius 8px
          background-color var(--secondary-color, #d3d3d3)

        .primary
          background-color var(--primary-color, #00f)
          color white

        .active
          opacity 0.9

        .button.primary
          font-weight bold

        .button.active
          background-color var(--active-bg, transparent)

        .button.primary.active
          border-width 2px

        .button::part(icon)
          width var(--spacing-md, 16px)
          height var(--spacing-md, 16px)

        .button.primary::part(icon)
          opacity 1

        .button::part(label)
          font-size var(--font-size-lg, 16px)
      `,
      globalStyles: `
        .button
          cursor pointer

        .button::part(label)
          text-transform uppercase
      `,
      localStyles: `
        .button
          min-width 100px

        .button.primary
          min-height 40px
      `,
      inlineStyleProps: {
        style: { marginRight: 10 },
        iconStyle: { marginRight: 5 }
      }
    }), {
      style: {
        paddingTop: 16,
        paddingBottom: 16,
        paddingLeft: 16,
        paddingRight: 16,
        borderRadius: 8,
        backgroundColor: 'rgba(0, 0, 255, 0.1)',
        color: '#fff',
        opacity: 0.9,
        fontWeight: 'bold',
        borderWidth: 2,
        cursor: 'pointer',
        minWidth: 100,
        minHeight: 40,
        marginRight: 10
      },
      iconStyle: {
        width: 16,
        height: 16,
        opacity: 1,
        marginRight: 5
      },
      labelStyle: {
        fontSize: 24,
        textTransform: 'uppercase'
      }
    })
  })
})
