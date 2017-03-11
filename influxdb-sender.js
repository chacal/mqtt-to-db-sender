const Influx = require('influx')
const _ = require('lodash')
const influxDBSimulator = {
  writePoints: points => {
    console.log('InfluxDB simulator writing points:', JSON.stringify(points))
    return { 'catch': _.noop }
  }
}

const client = process.platform === 'linux' ? influxDBClient() : influxDBSimulator

function influxDBClient() {
  return new Influx.InfluxDB({
    host : process.env.INFLUXDB_HOST || 'influxdb.netserver.chacal.online',
    port : process.env.INFLUXDB_PORT || 443,
    protocol : 'https',
    database : process.env.INFLUXDB_DB || 'sensors_test',
    username : process.env.INFLUXDB_USERNAME || 'influx',
    password : process.env.INFLUXDB_PASSWORD
  })
}

function saveEvent(event) {
  const points = commonPoints(event)

  switch(event.tag) {
    case 't':
      points.push(eventPoint('temperature', event, e => e.temperature))
      break;
    case 'p':
      points.push(eventPoint('pressure', event, e => e.pressure))
      break;
    case 'h':
      points.push(eventPoint('humidity', event, e => e.humidity))
      break;
    case 'c':
      points.push(eventPoint('current', event, e => e.current))
      break;
    case 'w':
      points.push(eventPoint('tankLevel', event, e => e.tankLevel))
      break;
    case 'e':
      points.push(eventPoint('ampHours', event, e => e.ampHours))
      break;
  }

  client.writePoints(points)
    .catch(err => console.log(err))

  function commonPoints(event) {
    const temp = []
    if(event.vcc)
      temp.push(eventPoint("sensorVoltage", event, e => e.vcc / 1000))
    if(event.previousSampleTimeMicros)
      temp.push(eventPoint("measurementDuration", event, e => e.previousSampleTimeMicros / 1000 / 1000))
    return temp
  }
}


function eventPoint(measurementName, event, valuesExtractor) {
  return {
    measurement: measurementName,
    timestamp: new Date(event.ts),
    tags: { instance: event.instance },
    fields: { value: valuesExtractor(event) }
  }
}

module.exports = {
  saveEvent
}