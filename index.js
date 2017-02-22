const Bacon = require('baconjs')
const mqtt = require('mqtt')
const influxDbSender = require('./influxdb-sender')

const MQTT_BROKER = process.env.MQTT_BROKER ? process.env.MQTT_BROKER : 'mqtt://mqtt-home.chacal.online'
const INFLUX_WRITE_THROTTLE = 2000     // Keep at least this much time in ms between saving event from _the same instance & tag_

startMqttClient(MQTT_BROKER)
  .flatMapLatest(mqttClient => {
    mqttClient.subscribe('/sensor/+/+/state')
    return Bacon.fromEvent(mqttClient, 'message', (topic, message) => ({ topic, message }))
  })
  .map('.message')
  .map(JSON.parse)
  .groupBy(event => event.instance + event.tag)                                                  // Group events by instance & tag
  .flatMap(eventsByInstanceAndTag => eventsByInstanceAndTag.throttle(INFLUX_WRITE_THROTTLE))     // Throttle each instance + tag group individuall
  .onValue(influxDbSender.saveEvent)

function startMqttClient(brokerUrl) {
  const client = mqtt.connect(brokerUrl)
  client.on('connect', () => console.log('Connected to MQTT server'))
  client.on('offline', () => console.log('Disconnected from MQTT server'))
  client.on('error', () => console.log('MQTT client error', e))

  return Bacon.fromEvent(client, 'connect').first()
    .map(() => client)
}
