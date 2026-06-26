// Backward-compatibility entrypoint for older Babel configs that selected
// `cache: 'teamplay'`. Runtime caching/subscriptions are now implemented by
// @cssxjs/css-to-rn; this file intentionally just re-exports the normal React
// Native runtime and does not import Teamplay.
export {
  default,
  runtime
} from './react-native.js'

export * from './react-native.js'
