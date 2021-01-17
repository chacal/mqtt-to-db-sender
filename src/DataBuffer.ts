import _ = require('lodash')

interface IBufferedData<T> {
  datum: T,
  bufferingTime: Date
}

export default class DataBuffer<T> {
  private _buf: IBufferedData<T>[]
  private readonly _maxSize: number
  private readonly _maxAgeMs: number

  constructor(maxSize: number, maxAgeMs: number) {
    this._buf = []
    this._maxSize = maxSize
    this._maxAgeMs = maxAgeMs
  }

  append(data: T[]) {
    const bufferedData = data.map(d => ({ datum: d, bufferingTime: new Date() }))
    this._buf = _.concat(this._buf, bufferedData)
  }

  data(): T[] {
    return _.map(this._buf, bp => bp.datum)
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
    return this.size() > 0 && oldestEventAge() >= this._maxAgeMs
  }
}