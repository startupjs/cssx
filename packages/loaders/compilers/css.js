// TODO: Move loaders into standalone libs
const cssLoader = require('../cssToReactNativeLoader.js')
const callLoader = require('../callLoader.js')
const { stripExport } = require('./helpers')

module.exports = function compileCss (src) {
  return stripExport(
    callLoader(
      cssLoader,
      src
    )
  )
}
