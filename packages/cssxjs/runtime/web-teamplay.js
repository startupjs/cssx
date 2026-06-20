// Backward-compatibility entrypoint for older Babel configs that selected
// `cache: 'teamplay'`. Runtime caching/subscriptions are now implemented by
// @cssxjs/css-to-rn; this file intentionally just re-exports the normal web
// runtime and does not import Teamplay.
export {
  default,
  runtime
} from './web.js'

export * from './web.js'
