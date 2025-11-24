// ref: https://github.com/kristerkari/react-native-stylus-transformer
const { existsSync } = require('fs')
const { join } = require('path')
const stylus = require('stylus')
const patchStylusAddUnit = require('./patches/patchStylusAddUnit.js')

// apply patches
patchStylusAddUnit()

const PROJECT_STYLES_PATH = join(process.cwd(), 'styles/index.styl')
let UI_STYLES_PATH
let UI_CORE_STYLES_PATH

function renderToCSS (src, filename, { platform } = {}) {
  const compiler = stylus(src)
  compiler.set('filename', filename)

  if (platform) {
    compiler.define('$PLATFORM', platform)
    compiler.define(`__${platform.toUpperCase()}__`, true)
  }

  if (checkUiStylesExist()) {
    compiler.import(UI_STYLES_PATH)
  }

  if (checkUiCoreStylesExist()) {
    compiler.import(UI_CORE_STYLES_PATH)
  }

  // TODO: Make this a setting
  if (checkProjectStylesExist()) {
    compiler.import(PROJECT_STYLES_PATH)
  }

  let compiled
  compiler.render(function (err, res) {
    if (err) {
      throw new Error(err)
    }
    compiled = res
  })

  return compiled
}

module.exports = function stylusToReactNative (source) {
  return renderToCSS(source, this.resourcePath, this.query)
}

// check if @startupjs/ui is being used to load styles file from it, cache result for 5 seconds
let uiStylesExist
let uiStylesLastChecked = 0
function checkUiStylesExist () {
  if (uiStylesLastChecked + 5000 > Date.now()) return uiStylesExist
  uiStylesLastChecked = Date.now()
  try {
    // TODO: make this configurable
    UI_STYLES_PATH = join(require.resolve('@startupjs/ui'), '../styles/index.styl')
    uiStylesExist = existsSync(UI_STYLES_PATH)
  } catch {
    uiStylesExist = false
  }
  return uiStylesExist
}

// check if @startupjs-ui/core is being used to load styles file from it, cache result for 5 seconds
let uiCoreStylesExist
let uiCoreStylesLastChecked = 0
function checkUiCoreStylesExist () {
  if (uiCoreStylesLastChecked + 5000 > Date.now()) return uiCoreStylesExist
  uiCoreStylesLastChecked = Date.now()
  try {
    // TODO: make this configurable
    UI_CORE_STYLES_PATH = join(require.resolve('@startupjs-ui/core'), '../styles/index.styl')
    uiCoreStylesExist = existsSync(UI_CORE_STYLES_PATH)
  } catch {
    uiCoreStylesExist = false
  }
  return uiCoreStylesExist
}

// check if project styles file exist, cache result for 5 seconds
let projectStylesExist
let projectStylesLastChecked = 0
function checkProjectStylesExist () {
  if (projectStylesLastChecked + 5000 > Date.now()) return projectStylesExist
  projectStylesLastChecked = Date.now()
  projectStylesExist = existsSync(PROJECT_STYLES_PATH)
  return projectStylesExist
}
