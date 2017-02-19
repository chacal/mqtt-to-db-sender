const Bacon = require('baconjs')
const mqtt = require('mqtt')
const influxDbSender = require('./influxdb-sender')

const MQTT_BROKER = process.env.MQTT_BROKER ? process.env.MQTT_BROKER : 'mqtt://ha-opi'

startMqttClient(MQTT_BROKER)
  .flatMapLatest(mqttClient => {
    mqttClient.subscribe('/sensor/+/+/state')
    return Bacon.fromEvent(mqttClient, 'message', (topic, message) => ({ topic, message }))
  })
  .onValue(({topic, message}) => influxDbSender.saveEvent(JSON.parse(message.toString())))

function startMqttClient(brokerUrl) {
  const client = mqtt.connect(brokerUrl)
  return Bacon.fromEvent(client, 'connect').first()
    .doAction(() => console.log("Connected to MQTT server"))
    .map(() => client)
}
