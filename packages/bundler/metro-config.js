// To pass existing config for modification, pass it as 'upstreamConfig' in options:
//   config = getDefaultConfig(__dirname, { upstreamConfig })
exports.getDefaultConfig = function getDefaultConfig (projectRoot, { upstreamConfig } = {}) {
  upstreamConfig ??= getUpstreamConfig(projectRoot)

  const config = {
    ...upstreamConfig,
    transformer: {
      ...upstreamConfig.transformer,
      babelTransformerPath: require.resolve('./metro-babel-transformer.js'),
      unstable_allowRequireContext: true
    },
    resolver: {
      ...upstreamConfig.resolver,
      sourceExts: [...new Set([
        ...(upstreamConfig.resolver.sourceExts || []),
        ...['css', 'styl']
      ])],
      unstable_enablePackageExports: true
    }
  }

  return config
}

function getUpstreamConfig (projectRoot) {
  try {
    // Expo
    return require('expo/metro-config').getDefaultConfig(projectRoot)
  } catch (err) {
    try {
      // React Native 0.73+
      return require('@react-native/metro-config').getDefaultConfig(projectRoot)
    } catch (err) {
      // React Native <0.73
      return require('metro-config').getDefaultConfig()
    }
  }
}
