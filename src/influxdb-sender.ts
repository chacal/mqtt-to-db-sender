import {InfluxDB, IPoint, ISingleHostConfig} from 'influx'
import _ = require('lodash')
import {SensorEvents as Events} from '@chacal/js-utils'
import InfluxDBSimulator from './InfluxDbSimulator'

const client: InfluxDB = process.platform === 'linux' ? influxDBClient() : new InfluxDBSimulator

function influxDBClient() {
  return new InfluxDB({
    host: process.env.INFLUXDB_HOST || 'influxdb.netserver.chacal.fi',
    port: process.env.INFLUXDB_PORT || 443,
    protocol: 'https',
    database: process.env.INFLUXDB_DB || 'sensors_test',
    username: process.env.INFLUXDB_USERNAME || 'influx',
    password: process.env.INFLUXDB_PASSWORD
  } as ISingleHostConfig)
}

export default function saveEvent(event: Events.ISensorEvent) {
  const points = _.filter(_.concat(commonPoints(event), sensorPointFromEvent(event)))

  return client.writePoints(points)
}


function commonPoints(event): IPoint[] {
  const temp = []
  if(event.vcc)
    temp.push(eventPoint('sensorVoltage', event, e => e.vcc / 1000))
  if(event.previousSampleTimeMicros)
    temp.push(eventPoint('measurementDuration', event, e => e.previousSampleTimeMicros / 1000 / 1000))
  if(event.rssi !== undefined)
    temp.push(eventPoint('rssi', event, e => e.rssi))
  return temp
}

function sensorPointFromEvent(event: Events.ISensorEvent): IPoint {
  if(Events.isTemperature(event)) {
    return eventPoint('temperature', event, e => e.temperature)
  } else if(Events.isPressure(event)) {
    return eventPoint('pressure', event, e => e.pressure)
  } else if(Events.isHumidity(event)) {
    return eventPoint('humidity', event, e => e.humidity)
  } else if(Events.isCurrent(event)) {
    return eventPoint('current', event, e => e.current)
  } else if(Events.isTankLevel(event)) {
    return eventPoint('tankLevel', event, e => e.tankLevel)
  } else if(Events.isElectricEnergy(event)) {
    return eventPoint('ampHours', event, e => e.ampHours)
  } else if(Events.isLevelReport(event)) {
    return eventPoint('level', event, e => e.level)
  } else if(Events.isPirEvent(event)) {
    return eventPoint('motionDetected', event, e => e.motionDetected ? 1 : 0)
  } else if(Events.isThreadDisplayStatus(event)) {
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
  }
}

function eventPoint<E extends Events.ISensorEvent>(measurementName: string, event: E, valuesExtractor: (event: E) => number): IPoint {
  const value = valuesExtractor(event)
  if(value !== undefined && value !== null) {
    return {
      measurement: measurementName,
      timestamp: new Date(event.ts),
      tags: {instance: event.instance},
      fields: {value: valuesExtractor(event)}
    }
  } else {
    return undefined
  }
}
