import mqtt = require('mqtt')
import Bacon = require('baconjs')
import EventStream = Bacon.EventStream
import Client = mqtt.Client
import { SensorEvents as Events } from '@chacal/js-utils'
import { IPublishPacket, Packet, PacketCallback } from 'mqtt'
import DbSender from './DbSender'

const DB_INSERT_RETRY_TIMEOUT_MS = 10000

export default class MqttToDbBridge {
  constructor(
    private readonly brokerUrl: string,
    private readonly username: string,
    private readonly password: string,
    private readonly clientId: string,
    private readonly db: DbSender) {
  }

  start() {
    const _db = this.db

    startMqttClient(this.brokerUrl, this.username, this.password, this.clientId)
      .onValue(mqttClient => {
        mqttClient.subscribe('/sensor/+/+/state', { qos: 1 })
        mqttClient.handleMessage = handleMqttPacket
      })

    function handleMqttPacket(packet: Packet, cb: PacketCallback) {
      if (packet.cmd === 'publish') {
        handlePublishPacket(packet, cb)
      } else {
        console.log('Unknown packet received:', packet)
        cb()
      }
    }

    function handlePublishPacket(packet: IPublishPacket, cb: PacketCallback) {
      try {
        const event = sensorEventFromMQTTMessage(packet.payload.toString())
        handleEvent(event, cb)
      } catch (e) {
        console.log('Unknown error, discarding message!', e)
        cb()
      }
    }

    function handleEvent(event: Events.ISensorEvent, cb: PacketCallback, isRetry: boolean = false) {
      if (!isRetry) {
        _db.bufferEvent(event)
      }
      _db.insertBufferIfNeeded()
        .then(() => cb())
        .catch(e => {
          console.log('Error writing to DB, retrying..', e.message)
          setTimeout(() => handleEvent(event, cb, true), DB_INSERT_RETRY_TIMEOUT_MS)
        })
    }
  }
}


function startMqttClient(brokerUrl: string, username: string, password: string, clientId: string): EventStream<Client> {
  const client = mqtt.connect(brokerUrl, {
    username,
    password,
    clientId,
    clean: false
  })
  client.on('connect', () => console.log('Connected to MQTT server'))
  client.on('offline', () => console.log('Disconnected from MQTT server'))
  client.on('error', (e) => console.log('MQTT client error', e))

  return Bacon.fromEvent(client, 'connect').first()
    .map(() => client)
}


function sensorEventFromMQTTMessage(message: string): Events.ISensorEvent {
  return JSON.parse(message) as Events.ISensorEvent
}
