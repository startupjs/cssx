import { Dimensions, Platform } from 'react-native'

export function getDimensions () {
  return Dimensions.get('window')
}

export function getPlatform () {
  return Platform.OS
}
