const stylusToCssLoader = require('./lib/stylusToCssLoader')
const cssToReactNativeLoader = require('./lib/cssToReactNativeLoader')
const cssxjsBabelLoader = require('./lib/cssxjsBabelLoader')
const callLoader = require('./lib/callLoader')

module.exports.transform = async function cssxjsMetroBabelTransform ({
  src, filename, options: { upstreamTransformer, ...options } = {}
}) {
  upstreamTransformer ??= getUpstreamTransformer()
  const { platform } = options

  // from exotic extensions to js
  if (/\.styl$/.test(filename)) {
    // TODO: Refactor `platform` to be just passed externally as an option in metro and in webpack
    src = callLoader(stylusToCssLoader, src, filename, { platform })
    src = callLoader(cssToReactNativeLoader, src, filename)
  } else if (/\.css$/.test(filename)) {
    src = callLoader(cssToReactNativeLoader, src, filename)
  }

  // js transformations
  if (/\.[mc]?[jt]sx?$/.test(filename)) {
    src = callLoader(cssxjsBabelLoader, src, filename, { platform })
  }

  return upstreamTransformer.transform({ src, filename, options })
}

function getUpstreamTransformer () {
  try {
    // Expo
    return require('@expo/metro-config/babel-transformer')
  } catch (err) {
    try {
      // React Native 0.73+
      return require('@react-native/metro-babel-transformer')
    } catch (err) {
      // React Native <0.73
      return require('metro-react-native-babel-transformer')
    }
  }
}
