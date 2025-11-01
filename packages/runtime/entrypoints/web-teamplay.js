import { setPlatformHelpers } from '../platformHelpers/index.js'
import * as platformHelpers from '../platformHelpers/web.js'
import { process } from '../processCached.js'

setPlatformHelpers(platformHelpers)

export default process
