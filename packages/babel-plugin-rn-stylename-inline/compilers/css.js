// TODO: Move loaders into standalone libs
const cssLoader = require('@cssxjs/loaders/cssToReactNativeLoader')
const callLoader = require('@cssxjs/loaders/callLoader')
const { stripExport } = require('./helpers')

module.exports = function compileCss (src) {
  return stripExport(
    callLoader(
      cssLoader,
      src
    )
  )
}
