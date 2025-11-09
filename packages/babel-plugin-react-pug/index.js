/**
 * transform-react-pug-early.cjs
 * Run babel-plugin-transform-react-pug early by piping its full visitor in `pre`.
 * Works with programmatic transformAsync as well.
 *
 * .babelrc:
 * {
 *   "plugins": [
 *     ["./transform-react-pug-early.cjs", { "classAttribute": "className" }],
 *     "@babel/plugin-transform-react-jsx"
 *   ]
 * }
 */
const pluginTransformReactPug = require('@startupjs/babel-plugin-transform-react-pug').default
const pluginReactPugClassnames = require('@cssxjs/babel-plugin-react-pug-classnames')

const DEFAULT_MAGIC_IMPORTS = ['cssxjs', 'startupjs']

module.exports = function (babel) {
  const pugVisitor = pluginTransformReactPug(babel)?.visitor
  if (!pugVisitor) throw Error('transform-react-pug-early: unable to load upstream plugin')
  const classnamesVisitor = pluginReactPugClassnames(babel)?.visitor
  if (!classnamesVisitor) throw Error('transform-react-pug-early: unable to load classnames plugin')

  return {
    visitor: {
      Program: {
        enter ($this, state) {
          // traverse and check that if the file contains pug templates then there is a 'pug' import present from the magic library.
          // If no 'pug' import found while the pug template string is present -- throw the buildError.
          const magicImports = state.opts.magicImports || DEFAULT_MAGIC_IMPORTS
          $this.traverse({
            ImportDeclaration: ($import) => {
              if (!magicImports.includes($import.node.source.value)) return
              for (const $specifier of $import.get('specifiers')) {
                if (!$specifier.isImportSpecifier()) continue
                const { imported } = $specifier.node
                if (imported.name === 'pug') {
                  state.hasPugImport = true
                  // remove the 'pug' import specifier after marking its presence
                  $specifier.remove()
                  if ($import.get('specifiers').length === 0) $import.remove()
                }
              }
            },
            TaggedTemplateExpression: ($taggedTemplate) => {
              if ($taggedTemplate.node.tag.name !== 'pug') return
              if (!state.hasPugImport) {
                throw $taggedTemplate.buildCodeFrameError(
                  "babel-plugin-react-pug: 'pug' import is missing. Please import it.\""
                )
              }
            }
          }, state)

          // main transformation of pug to jsx
          $this.traverse(pugVisitor, state)
          // support calling sub-components in pug (like <Modal.Header />)
          $this.traverse(classnamesVisitor, state)
          // re-crawl to update scope bindings
          $this.scope.crawl()
        }
      }
    }
  }
}
