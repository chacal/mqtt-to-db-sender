import mqtt = require('mqtt')
import process = require('process')
import Bacon = require('baconjs')
import EventStream = Bacon.EventStream
import saveEventToInfluxDB from './influxdb-sender'
import Client = mqtt.Client
import ISensorEvent from "./ISensorEvent"

// Declare fromEvent() version thas is used with MQTT message handler
declare module 'baconjs' {
  function fromEvent<E, A>(target: EventTarget|NodeJS.EventEmitter|JQuery, eventName: string, eventTransformer: (t: string, m: string) => A): EventStream<E, A>;
}


const MQTT_BROKER = process.env.MQTT_BROKER ? process.env.MQTT_BROKER : 'mqtt://mqtt-home.chacal.online'
const MQTT_USERNAME = process.env.MQTT_USERNAME || undefined
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || undefined
const INFLUX_WRITE_THROTTLE = 2000     // Keep at least this much time in ms between saving event from _the same instance & tag_


startMqttClient(MQTT_BROKER, MQTT_USERNAME, MQTT_PASSWORD)
  .flatMapLatest(mqttClient => {
    mqttClient.subscribe('/sensor/+/+/state')
    return Bacon.fromEvent(mqttClient, 'message', sensorEventFromMQTTMessage)
  })
  .groupBy(event => event.instance + event.tag)                                                  // Group events by instance & tag
  .flatMap(eventsByInstanceAndTag => eventsByInstanceAndTag.throttle(INFLUX_WRITE_THROTTLE))     // Throttle each instance + tag group individually
  .onValue(saveEventToInfluxDB)


function startMqttClient<A>(brokerUrl: string, username: string, password: string): EventStream<A, Client> {
  const client = mqtt.connect(brokerUrl, { username, password })
  client.on('connect', () => console.log('Connected to MQTT server'))
  client.on('offline', () => console.log('Disconnected from MQTT server'))
  client.on('error', (e) => console.log('MQTT client error', e))

  return Bacon.fromEvent(client, 'connect').first()
    .map(() => client)
}

function sensorEventFromMQTTMessage(topic: string, message: string): ISensorEvent {
  return JSON.parse(message) as ISensorEvent
}
