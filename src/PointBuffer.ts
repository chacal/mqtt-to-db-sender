import { IPoint } from 'influx'
import _ = require('lodash')

interface IBufferedPoint {
  point: IPoint,
  bufferingTime: Date
}

export default class PointBuffer {
  private _buf: IBufferedPoint[]
  private readonly _maxSize: number
  private readonly _maxAgeMs: number

  constructor(maxSize: number, maxAgeMs: number) {
    this._buf = []
    this._maxSize = maxSize
    this._maxAgeMs = maxAgeMs
  }

  append(points: IPoint[]) {
    const bufferedPoints = points.map(p => ({ point: p, bufferingTime: new Date() }))
    this._buf = _.concat(this._buf, bufferedPoints)
  }

  points(): IPoint[] {
    return _.map(this._buf, bp => bp.point)
  }

  clear() {
    this._buf = []
  }

  size(): number {
    return this._buf.length
  }

  isFull(): boolean {
    return this._buf.length >= this._maxSize
  }

  isTooOld(): boolean {
    const oldestEventAge = () => new Date().getTime() - this._buf[0].bufferingTime.getTime()
    return this.size() >= 0 && oldestEventAge() >= this._maxAgeMs
  }
}