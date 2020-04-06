import { InfluxDB, IPoint } from 'influx'
import _ = require('lodash')
import { SensorEvents, SensorEvents as Events } from '@chacal/js-utils'
import InfluxDBSimulator from './InfluxDbSimulator'
import DataBuffer from './DataBuffer'
import DbSender, { DbConfig } from './DbSender'
import { formatDbConfig } from './utils'

const INFLUX_BUFFER_MAX_ITEM_COUNT = 1000
const INFLUX_BUFFER_MAX_AGE_MS = 5000

export default class InfluxdbSender implements DbSender {
  private readonly pointBuffer = new DataBuffer<IPoint>(INFLUX_BUFFER_MAX_ITEM_COUNT, INFLUX_BUFFER_MAX_AGE_MS)
  private client: InfluxDB

  constructor(config: DbConfig) {
    console.log(formatDbConfig(config))
    this.client = process.platform === 'linux' ? influxDBClient(config) : new InfluxDBSimulator
  }

  bufferEvent(event: SensorEvents.ISensorEvent): void {
    const newPoints = _.filter(_.concat(commonPoints(event), sensorPointsFromEvent(event)))
    this.pointBuffer.append(newPoints)
  }

  insertBufferIfNeeded(): Promise<void> {
    if (this.pointBuffer.isFull() || this.pointBuffer.isTooOld()) {
      return this.client.writePoints(this.pointBuffer.data())
        .then(() => this.pointBuffer.clear())
    } else {
      return Promise.resolve()
    }
  }
}

function influxDBClient(config: DbConfig) {
  return new InfluxDB(Object.assign({}, config, { protocol: 'https' }))
}

function commonPoints(event): IPoint[] {
  const temp = []
  if (event.vcc)
    temp.push(eventPoint('sensorVoltage', event, e => e.vcc / 1000))
  if (event.previousSampleTimeMicros)
    temp.push(eventPoint('measurementDuration', event, e => e.previousSampleTimeMicros / 1000 / 1000))
  if (event.rssi !== undefined)
    temp.push(eventPoint('rssi', event, e => e.rssi))
  return temp
}

function sensorPointsFromEvent(event: Events.ISensorEvent): IPoint | IPoint[] {
  if (Events.isTemperature(event)) {
    return eventPoint('temperature', event, e => e.temperature)
  } else if (Events.isPressure(event)) {
    return eventPoint('pressure', event, e => e.pressure)
  } else if (Events.isHumidity(event)) {
    return eventPoint('humidity', event, e => e.humidity)
  } else if (Events.isEnvironment(event)) {
    return [
      eventPoint('temperature', event, e => e.temperature),
      eventPoint('pressure', event, e => e.pressure),
      eventPoint('humidity', event, e => e.humidity)
    ]
  } else if (Events.isCurrent(event)) {
    return eventPoint('current', event, e => e.current)
  } else if (Events.isTankLevel(event)) {
    return eventPoint('tankLevel', event, e => e.tankLevel)
  } else if (Events.isElectricEnergy(event)) {
    return eventPoint('ampHours', event, e => e.ampHours)
  } else if (Events.isLevelReport(event)) {
    return eventPoint('level', event, e => e.level)
  } else if (Events.isPirEvent(event)) {
    return eventPoint('motionDetected', event, e => e.motionDetected ? 1 : 0)
  } else if (Events.isThreadDisplayStatus(event)) {
    return {
      measurement: 'threadParentInfo',
      timestamp: new Date(event.ts),
      tags: {
        instance: event.instance,
        parentRloc16: event.parent.rloc16
      },
      fields: {
        linkQualityIn: event.parent.linkQualityIn,
        linkQualityOut: event.parent.linkQualityOut,
        avgRssi: event.parent.avgRssi,
        latestRssi: event.parent.latestRssi
      }
    }
  } else if (Events.isImpulseEvent(event)) {
    return eventPoint('impulse', event, e => 1)
  }
}

function eventPoint<E extends Events.ISensorEvent>(measurementName: string, event: E, valuesExtractor: (event: E) => number): IPoint {
  const value = valuesExtractor(event)
  if (value !== undefined && value !== null) {
    return {
      measurement: measurementName,
      timestamp: new Date(event.ts),
      tags: { instance: event.instance },
      fields: { value: valuesExtractor(event) }
    }
  } else {
    return undefined
  }
}
