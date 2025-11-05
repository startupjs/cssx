// TODO: Move loaders into standalone libs
const stylLoader = require('@cssxjs/loaders/stylusToCssLoader')
const callLoader = require('@cssxjs/loaders/callLoader')
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
