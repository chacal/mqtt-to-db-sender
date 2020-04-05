import { SensorEvents as Events } from '@chacal/js-utils/built/ISensorEvent'

export default interface DbSender {
  bufferEvent(event: Events.ISensorEvent): void

  insertBufferIfNeeded(): Promise<void>
}

export interface DbConfig {
  host: string
  port: number
  username: string
  password: string
  database: string
}