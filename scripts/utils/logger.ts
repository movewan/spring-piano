// Migration Logger Utility

export type LogLevel = 'info' | 'warn' | 'error' | 'success' | 'debug'

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  data?: unknown
}

const logs: LogEntry[] = []

const colors = {
  info: '\x1b[36m',    // cyan
  warn: '\x1b[33m',    // yellow
  error: '\x1b[31m',   // red
  success: '\x1b[32m', // green
  debug: '\x1b[90m',   // gray
  reset: '\x1b[0m'
}

export function log(level: LogLevel, message: string, data?: unknown) {
  const timestamp = new Date().toISOString()
  const entry: LogEntry = { timestamp, level, message, data }
  logs.push(entry)

  const color = colors[level]
  const levelStr = level.toUpperCase().padEnd(7)
  const prefix = `[${timestamp.slice(11, 19)}] ${color}${levelStr}${colors.reset}`

  if (data) {
    console.log(prefix, message, JSON.stringify(data, null, 2))
  } else {
    console.log(prefix, message)
  }
}

export const logger = {
  info: (msg: string, data?: unknown) => log('info', msg, data),
  warn: (msg: string, data?: unknown) => log('warn', msg, data),
  error: (msg: string, data?: unknown) => log('error', msg, data),
  success: (msg: string, data?: unknown) => log('success', msg, data),
  debug: (msg: string, data?: unknown) => log('debug', msg, data),

  getLogs: () => [...logs],

  summary: () => {
    const counts = logs.reduce((acc, entry) => {
      acc[entry.level] = (acc[entry.level] || 0) + 1
      return acc
    }, {} as Record<LogLevel, number>)

    console.log('\n' + '='.repeat(50))
    console.log('Migration Summary')
    console.log('='.repeat(50))
    console.log(`  Success: ${colors.success}${counts.success || 0}${colors.reset}`)
    console.log(`  Info:    ${colors.info}${counts.info || 0}${colors.reset}`)
    console.log(`  Warnings: ${colors.warn}${counts.warn || 0}${colors.reset}`)
    console.log(`  Errors:  ${colors.error}${counts.error || 0}${colors.reset}`)
    console.log('='.repeat(50))

    return counts
  }
}
