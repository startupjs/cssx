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
const pluginReactPugClassnames = require('@startupjs/babel-plugin-react-pug-classnames')

module.exports = function (babel) {
  const pugVisitor = pluginTransformReactPug(babel)?.visitor
  if (!pugVisitor) throw Error('transform-react-pug-early: unable to load upstream plugin')
  const classnamesVisitor = pluginReactPugClassnames(babel)?.visitor
  if (!classnamesVisitor) throw Error('transform-react-pug-early: unable to load classnames plugin')

  return {
    visitor: {
      Program: {
        enter ($this, state) {
          // main transformation of pug to jsx
          $this.traverse(pugVisitor, state)
          // support calling sub-components in pug (like <Modal.Header />)
          $this.traverse(classnamesVisitor, state)
        }
      }
    }
  }
}
