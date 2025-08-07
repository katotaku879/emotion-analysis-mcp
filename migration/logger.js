// migration/logger.js
const fs = require('fs');
const path = require('path');

class Logger {
  constructor(config) {
    this.config = config;
    this.logDir = config.paths.logs;
    
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    this.streams = {
      main: fs.createWriteStream(path.join(this.logDir, 'migration.log'), { flags: 'a' }),
      error: fs.createWriteStream(path.join(this.logDir, 'migration_error.log'), { flags: 'a' }),
      stats: fs.createWriteStream(path.join(this.logDir, 'migration_stats.log'), { flags: 'a' })
    };
  }

  log(level, message, recordId = null, additionalInfo = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      recordId,
      ...additionalInfo
    };

    const logLine = this.formatLogEntry(logEntry);
    this.streams.main.write(logLine + '\n');

    if (['FATAL', 'ERROR'].includes(level)) {
      this.streams.error.write(logLine + '\n');
    }

    if (this.config.logging.toConsole) {
      console.log(logLine);
    }
  }

  formatLogEntry(entry) {
    let formatted = `[${entry.timestamp}] ${entry.level}: ${entry.message}`;
    
    if (entry.recordId) {
      formatted += `\nRecord ID: ${entry.recordId}`;
    }

    Object.entries(entry).forEach(([key, value]) => {
      if (!['timestamp', 'level', 'message', 'recordId'].includes(key)) {
        formatted += `\n${key}: ${value}`;
      }
    });

    return formatted + '\n---';
  }

  info(message, recordId = null, additionalInfo = {}) {
    this.log('INFO', message, recordId, additionalInfo);
  }

  error(message, recordId = null, additionalInfo = {}) {
    this.log('ERROR', message, recordId, additionalInfo);
  }

  warning(message, recordId = null, additionalInfo = {}) {
    this.log('WARNING', message, recordId, additionalInfo);
  }

  fatal(message, recordId = null, additionalInfo = {}) {
    this.log('FATAL', message, recordId, additionalInfo);
  }

  close() {
    Object.values(this.streams).forEach(stream => stream.end());
  }
}

module.exports = Logger;
