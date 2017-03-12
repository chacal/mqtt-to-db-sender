import {InfluxDB, IPoint, IWriteOptions} from "influx"

class InfluxDBSimulator extends InfluxDB {
  writePoints(points: IPoint[], options?: IWriteOptions): Promise<void> {
    console.log("InfluxDB simulator: ", JSON.stringify(points))
    return Promise.resolve()
  }
}

export default InfluxDBSimulator