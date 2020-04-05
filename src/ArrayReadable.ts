import { Readable } from 'stream'

export default class ArrayReadable<T> extends Readable {
  private readonly arr: T[]

  constructor(arr: T[]) {
    super({ objectMode: true })
    this.arr = [...arr]
  }

  _read(size: number): void {
    const item = this.arr.shift()
    this.push(item !== undefined ? item : null)
  }
}
