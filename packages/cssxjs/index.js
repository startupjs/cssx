export { default as variables } from '@cssxjs/runtime/variables'
export { defaultVariables, setDefaultVariables } from '@cssxjs/runtime/variables'
export { default as dimensions } from '@cssxjs/runtime/dimensions'
export { default as matcher } from '@cssxjs/runtime/matcher'

export function css (cssString) {
  throw Error('[cssxjs] Unprocessed \'css\' template string. Bundler (Babel / Metro) did not process this file correctly.')
}

export function styl (stylString) {
  throw Error('[cssxjs] Unprocessed \'styl\' template string. Bundler (Babel / Metro) did not process this file correctly.')
}

export function pug (pugString) {
  throw Error('[cssxjs] Unprocessed \'pug\' template string. Bundler (Babel / Metro) did not process this file correctly.')
}
