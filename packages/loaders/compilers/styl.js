// TODO: Move loaders into standalone libs
const stylLoader = require('../stylusToCssLoader.js')
const callLoader = require('../callLoader.js')
const compileCss = require('./css')

module.exports = function compileStyl (src, filename, options) {
  src = callLoader(
    stylLoader,
    src,
    filename,
    options
  )
  return compileCss(src)
}
