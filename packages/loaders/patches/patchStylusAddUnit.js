// add a new custom unit 'u' which is equal to 8px
const units = require('stylus/lib/units.js')
const Unit = require('stylus/lib/nodes/unit.js')
let patched = false

module.exports = function patchStylusAddUnit () {
  if (patched) return
  patched = true

  // add the unit itself
  if (!units.includes('u')) units.push('u')

  /**
   * a monkey patch to convert the 'type' to be dynamic setter/getter
   * with the real value stored in a private symbol. This simulates having 'u' unit converted to 'px' * 8 on assignment.
   *
   * Original constructor is the following:
   *
   *   constructor(val, type) {
   *     super();
   *     this.val = val;
   *     this.type = type;
   *   }
   *
   * this.val and this.type are never reassigned.
   * This make it possible to hack the this.type assignment specifically by auto-multiplying the this.val by 8
   * during the attempt to assign the 'u' to this.type
   */

  const TYPE = Symbol('unit.type')
  Object.defineProperty(Unit.prototype, 'type', {
    configurable: true,
    enumerable: true,
    get () { return this[TYPE] },
    set (t) {
      if (t === 'u') {
        t = 'px'
        if (typeof this.val === 'number') this.val = this.val * 8
      }
      this[TYPE] = t
    }
  })
}
