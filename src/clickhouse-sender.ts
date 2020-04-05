import _ = require('lodash')
import { SensorEvents as Events } from '@chacal/js-utils'
import DataBuffer from './DataBuffer'
import Clickhouse from '@apla/clickhouse'
import ArrayReadable from './ArrayReadable'
import DbSender, { DbConfig } from './DbSender'
import { formatDbConfig, formatPw } from './utils'

const BUFFER_MAX_ITEM_COUNT = 5000
const BUFFER_MAX_AGE_MS = 5000


interface MeasurementRow {
  ts: number,
  instance: string,
  metric_names: string[],
  metric_values: number[]
}

interface Metric {
  name: string,
  value: number
}


export default class ClickHouseSender implements DbSender {
  private client: Clickhouse
  private readonly buffer = new DataBuffer<MeasurementRow>(BUFFER_MAX_ITEM_COUNT, BUFFER_MAX_AGE_MS)
  private tableCreated = false

  constructor(private readonly config: DbConfig) {
    console.log(formatDbConfig(config))
    this.client = new Clickhouse(Object.assign({}, config, {
      user: config.username,
      queryOptions: { database: config.database },
      protocol: 'https:'
    }))
  }

  bufferEvent(event: Events.ISensorEvent): void {
    const metrics = _.filter(_.concat(commonMetrics(event), sensorMetricFromEvent(event)))
    const row = {
      ts: new Date(event.ts).getTime(),
      instance: event.instance,
      metric_names: metrics.map(m => m.name),
      metric_values: metrics.map(m => m.value)
    }
    this.buffer.append([row])
  }

  insertBufferIfNeeded(): Promise<void> {
    if (this.buffer.isFull() || this.buffer.isTooOld()) {
      return this.insertRows(this.buffer.data())
        .then(() => this.buffer.clear())
    } else {
      return Promise.resolve()
    }
  }

  insertRows(rows: MeasurementRow[]): Promise<void> {
    if (!this.tableCreated) {
      return this.ensureTable()
        .then(() => this.tableCreated = true)
        .then(() => insertQuery(this.client, rows))
    } else {
      return insertQuery(this.client, rows)
    }
  }

  ensureTable(): Promise<void> {
    console.log('Creating table')
    return this.client.querying(`
      CREATE TABLE IF NOT EXISTS measurements (
          ts             DateTime64(3) Codec(DoubleDelta, LZ4),
          instance       LowCardinality(String),
          metric_names   Array(LowCardinality(String)),
          metric_values  Array(Float32) Codec(Gorilla, LZ4)
      ) ENGINE = MergeTree()
      PARTITION BY toYYYYMM(ts)
      ORDER BY (ts, instance)
    `)
  }
}

function insertQuery(client: Clickhouse, rows: MeasurementRow[]) {
  return new Promise<void>((resolve, reject) => {
    const q = client.query('INSERT INTO measurements', {
      format: 'JSONEachRow'
    }, (err) => {
      if (err) {
        reject(err)
      }
      resolve()
    })

    q.on('error', e => {
      // Ignore, same error is handler by query callback. This handler is only needed to prevent Node from terminating.
    })

    const readable = new ArrayReadable(rows)
    readable.pipe(q)
  })
}


function commonMetrics(event): Metric[] {
  const temp = []
  if (event.vcc)
    temp.push(eventMetric('sensorVoltage', event, e => e.vcc / 1000))
  if (event.previousSampleTimeMicros)
    temp.push(eventMetric('measurementDuration', event, e => e.previousSampleTimeMicros / 1000 / 1000))
  if (event.rssi !== undefined)
    temp.push(eventMetric('rssi', event, e => e.rssi))
  return temp
}

function sensorMetricFromEvent(event: Events.ISensorEvent): Metric | Metric[] {
  if (Events.isTemperature(event)) {
    return eventMetric('temperature', event, e => e.temperature)
  } else if (Events.isPressure(event)) {
    return eventMetric('pressure', event, e => e.pressure)
  } else if (Events.isHumidity(event)) {
    return eventMetric('humidity', event, e => e.humidity)
  } else if (Events.isCurrent(event)) {
    return eventMetric('current', event, e => e.current)
  } else if (Events.isTankLevel(event)) {
    return eventMetric('tankLevel', event, e => e.tankLevel)
  } else if (Events.isElectricEnergy(event)) {
    return eventMetric('ampHours', event, e => e.ampHours)
  } else if (Events.isLevelReport(event)) {
    return eventMetric('level', event, e => e.level)
  } else if (Events.isPirEvent(event)) {
    return eventMetric('motionDetected', event, e => e.motionDetected ? 1 : 0)
  } else if (Events.isThreadDisplayStatus(event)) {
    return [
      {
        name: 'thread_linkQualityIn',
        value: event.parent.linkQualityIn
      },
      {
        name: 'thread_linkQualityOut',
        value: event.parent.linkQualityOut
      },
      {
        name: 'thread_avgRssi',
        value: event.parent.avgRssi
      },
      {
        name: 'thread_latestRssi',
        value: event.parent.latestRssi
      },
      {
        name: 'thread_parentRloc16',
        value: parseInt(event.parent.rloc16)
      }
    ]
  } else if (Events.isImpulseEvent(event)) {
    return eventMetric('impulse', event, e => 1)
  }
}

function eventMetric<E extends Events.ISensorEvent>(metricName: string, event: E, valuesExtractor: (event: E) => number): Metric {
  const value = valuesExtractor(event)
  if (value !== undefined && value !== null) {
    return {
      name: metricName,
      value: valuesExtractor(event)
    }
  } else {
    return undefined
  }
}
