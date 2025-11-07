// platform - the actual platform (e.g. 'ios', 'android', 'web'). Default: 'web'.
//            On React Native this should be passed.
// reactType - force the React target platform (e.g. 'react-native', 'web'). Default: undefined.
//                 This shouldn't be needed in most cases since it will be automatically detected.
// cache - force the CSS caching library instance (e.g. 'teamplay'). Default: undefined
//         This shouldn't be needed in most cases since it will be automatically detected.
module.exports = (api, {
  platform,
  reactType,
  cache,
  transformPug = true,
  transformCss = true
} = {}) => {
  return {
    overrides: [{
      test: isJsxSource,
      plugins: [
        // support JSX syntax
        require('@babel/plugin-syntax-jsx')
      ]
    }, {
      test: isTypeScriptSource,
      plugins: [
        // support TypeScript syntax
        require('@babel/plugin-syntax-typescript')
      ]
    }, {
      test: isTsxSource,
      plugins: [
        // support TypeScript + JSX syntax
        [require('@babel/plugin-syntax-typescript'), {
          isTSX: true
        }]
      ]
    }, {
      plugins: [
        // transform pug to jsx. This generates a bunch of new AST nodes
        // (it's important to do this first before any dead code elimination runs)
        transformPug && [require('@cssxjs/babel-plugin-react-pug'), {
          classAttribute: 'styleName'
        }],
        // inline CSS modules (styl`` in the same JSX file -- similar to how it is in Vue.js)
        transformCss && [require('@cssxjs/babel-plugin-rn-stylename-inline'), {
          platform
        }],
        // CSS modules (separate .styl/.css file)
        transformCss && [require('@cssxjs/babel-plugin-rn-stylename-to-style'), {
          extensions: ['styl', 'css'],
          useImport: true,
          reactType,
          cache
        }]
      ].filter(Boolean)
    }]
  }
}

// all files which are not .ts or .tsx are considered to be pure JS with JSX support
function isJsxSource (fileName) {
  if (!fileName) return false
  return !isTypeScriptSource(fileName) && !isTsxSource(fileName)
}

function isTypeScriptSource (fileName) {
  if (!fileName) return false
  return fileName.endsWith('.ts')
}

// NOTE: .tsx is the default when fileName is not provided.
//       This is because we want to support the most overarching syntax by default.
function isTsxSource (fileName) {
  if (!fileName) return true
  return fileName.endsWith('.tsx')
}
