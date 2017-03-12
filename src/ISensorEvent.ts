//
// Interfaces
//
export interface ISensorEventBase {
  readonly instance: string,
  readonly tag: string,
  readonly ts: string,
  readonly vcc?: number,
  readonly previousSampleTimeMicros?: number
}

export interface ITemperatureEvent extends ISensorEventBase {
  readonly temperature: number
}

export interface IPressureEvent extends ISensorEventBase {
  readonly pressure: number
}

export interface IHumidityEvent extends ISensorEventBase {
  readonly humidity: number
}

export interface ICurrentEvent extends ISensorEventBase {
  readonly current: number
}

export interface ITankLevel extends ISensorEventBase {
  readonly tankLevel: number
}

export interface IElectricEnergyEvent extends ISensorEventBase {
  readonly ampHours: number
}

export type ISensorEvent = ITemperatureEvent | IPressureEvent | IHumidityEvent | ICurrentEvent | ITankLevel | IElectricEnergyEvent

export default ISensorEvent



//
// Type guards
//
export function isTemperature(event: ISensorEvent): event is ITemperatureEvent {
  return (<ITemperatureEvent>event).tag === 't';
}

export function isPressure(event: ISensorEvent): event is IPressureEvent {
  return (<IPressureEvent>event).tag === 'p';
}

export function isHumidity(event: ISensorEvent): event is IHumidityEvent {
  return (<IHumidityEvent>event).tag === 'h';
}

export function isCurrent(event: ISensorEvent): event is ICurrentEvent {
  return (<ICurrentEvent>event).tag === 'c';
}

export function isTankLevel(event: ISensorEvent): event is ITankLevel {
  return (<ITankLevel>event).tag === 'w';
}

export function isElectricEnergy(event: ISensorEvent): event is IElectricEnergyEvent {
  return (<IElectricEnergyEvent>event).tag === 'e';
}

