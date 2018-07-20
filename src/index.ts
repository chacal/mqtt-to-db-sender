import mqtt = require('mqtt')
import process = require('process')
import Bacon = require('baconjs')
import EventStream = Bacon.EventStream
import saveEventToInfluxDB from './influxdb-sender'
import Client = mqtt.Client
import { SensorEvents as Events } from "@chacal/js-utils"
import {Packet, PacketCallback, IPublishPacket} from "mqtt"

// Declare fromEvent() version thas is used with MQTT message handler
declare module 'baconjs' {
  function fromEvent<E, A>(target: EventTarget|NodeJS.EventEmitter|JQuery, eventName: string, eventTransformer: (t: string, m: string) => A): EventStream<E, A>;
}


const MQTT_BROKER = process.env.MQTT_BROKER ? process.env.MQTT_BROKER : 'mqtt://mqtt-home.chacal.fi'
const MQTT_USERNAME = process.env.MQTT_USERNAME || undefined
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || undefined


startMqttClient(MQTT_BROKER, MQTT_USERNAME, MQTT_PASSWORD)
  .onValue(mqttClient => {
    mqttClient.subscribe('/sensor/+/+/state', {qos: 1})
    mqttClient.handleMessage = handleMqttPacket
  })


function startMqttClient(brokerUrl: string, username: string, password: string): EventStream<{}, Client> {
  const client = mqtt.connect(brokerUrl, { username, password })
  client.on('connect', () => console.log('Connected to MQTT server'))
  client.on('offline', () => console.log('Disconnected from MQTT server'))
  client.on('error', (e) => console.log('MQTT client error', e))

  return Bacon.fromEvent(client, 'connect').first()
    .map(() => client)
}

function handleMqttPacket(packet: Packet, cb: PacketCallback) {
  if(packet.cmd === 'publish') {
    handlePublishPacket(packet, cb)
  } else {
    console.log('Unknown packet received:', packet)
    cb()
  }

  function handlePublishPacket(packet: IPublishPacket, cb: PacketCallback) {
    try {
      const event = sensorEventFromMQTTMessage(packet.payload.toString())
      handleEvent(event, cb)
    } catch(e) {
      console.log('Unknown error, discarding message!', e)
      cb()
    }
  }

  function handleEvent(event: Events.ISensorEvent, cb: PacketCallback) {
    saveEventToInfluxDB(event)
      .then(() => cb())
      .catch(e => {
        console.log('Error writing to Influx, retrying..', e)
        setTimeout(() => handleEvent(event, cb), 1000)
      })
  }
}

function sensorEventFromMQTTMessage(message: string): Events.ISensorEvent {
  return JSON.parse(message) as Events.ISensorEvent
}
