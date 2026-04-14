type LogLevel = 'info' | 'warn' | 'error'

function log(level: LogLevel, module: string, message: string, data?: Record<string, unknown>) {
  const entry = {
    time: new Date().toISOString(),
    level,
    module,
    message,
    ...data,
  }
  const line = JSON.stringify(entry)
  if (level === 'error') {
    console.error(line)
  } else if (level === 'warn') {
    console.warn(line)
  } else {
    console.log(line)
  }
}

export const logger = {
  info: (module: string, message: string, data?: Record<string, unknown>) =>
    log('info', module, message, data),
  warn: (module: string, message: string, data?: Record<string, unknown>) =>
    log('warn', module, message, data),
  error: (module: string, message: string, data?: Record<string, unknown>) =>
    log('error', module, message, data),
}
