const platformSingleton = require('@cssxjs/babel-plugin-rn-stylename-inline/platformSingleton')
const stylusToCssLoader = require('./lib/stylusToCssLoader')
const cssToReactNativeLoader = require('./lib/cssToReactNativeLoader')
const callLoader = require('./lib/callLoader')

module.exports.transform = async function cssxjsMetroBabelTransform ({
  src, filename, options: { upstreamTransformer, ...options } = {}
}) {
  upstreamTransformer ??= getUpstreamTransformer()
  const { platform } = options
  platformSingleton.value = platform

  // from exotic extensions to js
  if (/\.styl$/.test(filename)) {
    // TODO: Refactor `platform` to be just passed externally as an option in metro and in webpack
    src = callLoader(stylusToCssLoader, src, filename)
    src = callLoader(cssToReactNativeLoader, src, filename)
  } else if (/\.css$/.test(filename)) {
    src = callLoader(cssToReactNativeLoader, src, filename)
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
