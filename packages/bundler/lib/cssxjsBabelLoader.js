// TODO: add support for source maps
const babel = require('@babel/core')

module.exports = function cssxjsBabelLoader (source) {
  const filename = this.resourcePath
  const { platform } = this.query

  return babel.transformSync(source, {
    filename,
    babelrc: false,
    configFile: false,
    plugins: [
      [require('babel-preset-cssxjs'), {
        platform
      }]
    ]
  }).code
}
