import { DbConfig } from './DbSender'

export function formatPw(pw: string | undefined) {
  return pw ? pw.substr(0, 2) + pw.substr(2).replace(/./g, '*') : 'undefined'
}

export function formatDbConfig(config: DbConfig) {
  const temp = Object.assign({}, config, { password: formatPw(config.password) })
  return JSON.stringify(temp, null, 2)
}