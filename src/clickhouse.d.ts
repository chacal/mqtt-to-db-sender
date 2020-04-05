declare module '@apla/clickhouse' {
  import { Writable } from 'stream'

  interface DBOptions {
    readonly host: string
    readonly port: number
    readonly user: string
    readonly password: string
  }

  export interface QueryOptions {
    readonly format?: string
  }

  export type QueryStream = Writable
  export type QueryCallback<T> = (error?: Error, data?: T) => void

  export default class Clickhouse {
    constructor(options: DBOptions)

    querying<T = any>(query: string): Promise<T>
    query<T = any>(
      query: string,
      cb?: QueryCallback<T>
    ): QueryStream
    query<T = any>(
      query: string,
      options: QueryOptions,
      cb?: QueryCallback<T>
    ): QueryStream
  }
}
