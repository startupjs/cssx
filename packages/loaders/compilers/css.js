// TODO: Move loaders into standalone libs
const cssLoader = require('../cssToReactNativeLoader.js')
const callLoader = require('../callLoader.js')
const { stripExport } = require('./helpers')

module.exports = function compileCss (src, filename, options) {
  return stripExport(
    callLoader(
      cssLoader,
      src,
      filename,
      options
    )
  )
}
