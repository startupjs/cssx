/*
Copyright (c) 2014, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.
*/

export default match

// -----------------------------------------------------------------------------

const RE_LENGTH_UNIT = /(em|rem|px|cm|mm|in|pt|pc)?\s*$/
const RE_RESOLUTION_UNIT = /(dpi|dpcm|dppx)?\s*$/

function match (parsed, values) {
  if (!parsed) {
    return false
  }
  if (parsed.length === 1) {
    return matchQuery(parsed[0], values)
  }
  return parsed.some(mq => matchQuery(mq, values))
}

function matchQuery (query, values) {
  const inverse = query.inverse

  // Either the parsed or specified `type` is "all", or the types must be
  // equal for a match.
  const typeMatch = query.type === 'all' || values.type === query.type

  if (query.expressions.length === 0) {
    // Quit early when `type` doesn't match, but take "not" into account.
    if ((typeMatch && inverse) || !(typeMatch || inverse)) {
      return false
    }
  }

  const expressionsMatch = query.expressions.every(function (expression) {
    const feature = expression.feature
    const modifier = expression.modifier
    let expValue = expression.value
    let value = values[feature]

    // Missing or falsy values don't match.
    if (!value) {
      return false
    }

    switch (feature) {
      case 'orientation':
      case 'scan':
        return value.toLowerCase() === expValue.toLowerCase()

      case 'width':
      case 'height':
      case 'device-width':
      case 'device-height':
        expValue = toPx(expValue)
        value = toPx(value)
        break

      case 'resolution':
        expValue = toDpi(expValue)
        value = toDpi(value)
        break

      case 'aspect-ratio':
      case 'device-aspect-ratio':
      case /* Deprecated */ 'device-pixel-ratio':
        expValue = toDecimal(expValue)
        value = toDecimal(value)
        break

      case 'grid':
      case 'color':
      case 'color-index':
      case 'monochrome':
        expValue = parseInt(expValue, 10) || 1
        value = parseInt(value, 10) || 0
        break
    }

    switch (modifier) {
      case 'min':
        return value >= expValue
      case 'max':
        return value <= expValue
      default:
        return value === expValue
    }
  })

  const isMatch = typeMatch && expressionsMatch

  if (inverse) {
    return !isMatch
  }

  return isMatch
}

// -- Utilities ----------------------------------------------------------------

function toDecimal (ratio) {
  let decimal = Number(ratio)
  let numbers

  if (!decimal) {
    numbers = ratio.match(/^(\d+)\s*\/\s*(\d+)$/)
    decimal = numbers[1] / numbers[2]
  }

  return decimal
}

function toDpi (resolution) {
  const value = parseFloat(resolution)
  const units = String(resolution).match(RE_RESOLUTION_UNIT)[1]

  switch (units) {
    case 'dpcm':
      return value / 2.54
    case 'dppx':
      return value * 96
    default:
      return value
  }
}

function toPx (length) {
  const value = parseFloat(length)
  const units = String(length).match(RE_LENGTH_UNIT)[1]

  switch (units) {
    case 'em':
      return value * 16
    case 'rem':
      return value * 16
    case 'cm':
      return (value * 96) / 2.54
    case 'mm':
      return (value * 96) / 2.54 / 10
    case 'in':
      return value * 96
    case 'pt':
      return value * 72
    case 'pc':
      return (value * 72) / 12
    default:
      return value
  }
}
