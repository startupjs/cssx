import {
  cssx
} from '@cssxjs/css-to-rn/web'

export {
  CssxProvider,
  TrackedCssxSheet,
  configureCssx,
  defaultVariables,
  getCssVariable,
  getCssVariableRaw,
  isTrackedCssxSheet,
  setDefaultVariables,
  themed,
  useCssVariable,
  useCssVariableRaw,
  useCssxLayer,
  useRuntimeCss,
  useCssxComponentTag,
  useCssxConfig,
  useCssxRuntimeContext,
  useCssxSheet,
  useCssxTemplate,
  useMedia,
  variables
} from '@cssxjs/css-to-rn/web'

export { default as matcher } from '../matcher.js'

export function runtime (
  styleName,
  fileStyles,
  globalStyles,
  localStyles,
  inlineStyleProps
) {
  return cssx(
    styleName,
    collectLayers(fileStyles, globalStyles, localStyles),
    inlineStyleProps
  )
}

export default runtime

function collectLayers (...layers) {
  return layers.filter(isLayer)
}

function isLayer (layer) {
  return Boolean(
    typeof layer === 'string' ||
    (
      layer &&
      typeof layer === 'object' &&
      (
        layer.version === 1 ||
        Object.prototype.hasOwnProperty.call(layer, 'sheet')
      )
    )
  )
}
