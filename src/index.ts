import process = require('process')
import MqttToDbBridge from './MqttToDbBridge'
import ClickHouseSender from './clickhouse-sender'
import InfluxdbSender from './influxdb-sender'
import { formatPw } from './utils'

const MQTT_BROKER = process.env.MQTT_BROKER ? process.env.MQTT_BROKER : 'mqtt://mqtt-home.chacal.fi'
const MQTT_USERNAME = process.env.MQTT_USERNAME || undefined
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || undefined
const MQTT_CLIENT_ID = process.env.MQTT_CLIENT_ID || 'mqtt-to-db-sender'
const DB_TYPE = process.env.DB_TYPE || 'influxdb'

const DB_HOST = process.env.DB_HOST
const DB_PORT = parseInt(process.env.DB_PORT)
const DB_USERNAME = process.env.DB_USERNAME
const DB_PASSWORD = process.env.DB_PASSWORD
const DB_NAME = process.env.DB_NAME


console.log('Using configuration:')
console.log('MQTT_BROKER:'.padEnd(17), MQTT_BROKER)
console.log('MQTT_USERNAME:'.padEnd(17), MQTT_USERNAME)
console.log('MQTT_PASSWORD:'.padEnd(17), formatPw(MQTT_PASSWORD))
console.log('MQTT_CLIENT_ID:'.padEnd(17), MQTT_CLIENT_ID)
console.log('DB_TYPE:'.padEnd(17), DB_TYPE)


const dbConfig = {
  host: DB_HOST,
  port: DB_PORT,
  username: DB_USERNAME,
  password: DB_PASSWORD,
  database: DB_NAME
}
const db = DB_TYPE === 'influxdb' ? new InfluxdbSender(dbConfig) : new ClickHouseSender(dbConfig)
const mqttToDb = new MqttToDbBridge(MQTT_BROKER, MQTT_USERNAME, MQTT_PASSWORD, MQTT_CLIENT_ID, db)

mqttToDb.start()
