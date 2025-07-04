// TODO: Move loaders into standalone libs
const cssLoader = require('@cssxjs/bundler/lib/cssToReactNativeLoader')
const callLoader = require('@cssxjs/bundler/lib/callLoader')
const { stripExport } = require('./helpers')

module.exports = function compileCss (src) {
  return stripExport(
    callLoader(
      cssLoader,
      src
    )
  )
}
