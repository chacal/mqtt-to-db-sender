const influx = require('influx')
const _ = require('lodash')

const client = process.platform === 'linux' ? influxDBClient() : influxDBSimulator()

function influxDBClient() {
  return influx({
    host : process.env.INFLUXDB_HOST ? process.env.INFLUXDB_HOST : 'influxdb.chacal.online',
    protocol : 'https',
    username : process.env.INFLUXDB_USERNAME,
    password : process.env.INFLUXDB_PASSWORD,
    database : process.env.INFLUXDB_DB
  })
}

function influxDBSimulator() { return { writeSeries: series => console.log('InfluxDB simulator writing series:', JSON.stringify(series)) } }

function saveEvent(event) {
  const series = sensorEventSeries(event)

  switch(event.tag) {
    case 't':
      series.temperature = eventPoint(event, e => ({value: e.temperature}))
      break;
    case 'p':
      series.pressure = eventPoint(event, e => ({value: e.pressure}))
      break;
    case 'h':
      series.humidity = eventPoint(event, e => ({value: e.humidity}))
      break;
    case 'c':
      series.current = eventPoint(event, e => ({value: e.current}))
      break;
    case 'w':
      series.tankLevel = eventPoint(event, e => ({value: e.tankLevel}))
      break;
    case 'e':
      series.ampHours = eventPoint(event, e => ({value: e.ampHours}))
      break;
  }

  client.writeSeries(series, {}, (err, res) => {
    if(err) {
      console.log(err)
    }
  })

  function sensorEventSeries(event) {
    return {
      sensorVoltage: event.vcc ? eventPoint(event, e => ({value: e.vcc / 1000})) : undefined,
      measurementDuration: event.previousSampleTimeMicros ? eventPoint(event, e => ({value: e.previousSampleTimeMicros / 1000 / 1000})) : undefined
    }
  }
}


function eventPoint(event, valuesExtractor) {
  return [[_.assign({ time: event.ts }, valuesExtractor(event)), { instance: event.instance }]]
}

module.exports = {
  saveEvent
}