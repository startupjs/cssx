'use strict'

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

module.exports = function (babel) {
  const createUpstream = require('@startupjs/babel-plugin-transform-react-pug').default
  const upstream = createUpstream(babel)
  const upstreamVisitor = (upstream && upstream.visitor) || {}
  const processedFiles = new WeakSet()

  function getPassAndFile (ctx, firstArg) {
    // In Babel 7, pre(file) is called with File as arg; `this` is the plugin pass.
    const file = firstArg && firstArg.path ? firstArg : (ctx && ctx.file) || null
    const pass = ctx && ctx.file ? ctx : { file, opts: (ctx && ctx.opts) || {} }
    // If still no opts, try to read from file?.opts?.pluginOptions if present (rare)
    if (!pass.opts) pass.opts = {}
    return { pass, file }
  }

  return {
    name: 'transform-react-pug-early',

    // Proxy parser flags if upstream needs them.
    manipulateOptions (opts, parserOpts) {
      if (typeof upstream.manipulateOptions === 'function') {
        upstream.manipulateOptions(opts, parserOpts)
      }
    },

    // IMPORTANT: first arg is a Babel File; `this` is the plugin pass.
    pre (fileArg) {
      const { pass, file } = getPassAndFile(this, fileArg)
      if (!file || !file.path) return

      // Avoid double-processing
      if (processedFiles.has(file)) return
      processedFiles.add(file)

      // Respect upstream pre
      if (typeof upstream.pre === 'function') {
        upstream.pre.call(pass, pass) // upstream expects plugin pass-like object
      }

      // Early sweep with the FULL upstream visitor
      file.path.traverse(upstreamVisitor, pass)

      // Respect upstream post
      if (typeof upstream.post === 'function') {
        upstream.post.call(pass, pass)
      }
    },

    // No runtime visitors; everything happened in `pre`.
    visitor: {}
  }
}
