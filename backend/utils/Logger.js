/**
 * Centralized logging utility
 */
class Logger {
    constructor(service = 'API') {
      this.service = service;
    }
  
    formatMessage(level, message, meta = {}) {
      return JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        service: this.service,
        message,
        ...meta
      });
    }
  
    info(message, meta = {}) {
      console.log(this.formatMessage('INFO', message, meta));
    }
  
    error(message, meta = {}) {
      console.error(this.formatMessage('ERROR', message, meta));
    }
  
    warn(message, meta = {}) {
      console.warn(this.formatMessage('WARN', message, meta));
    }
  
    debug(message, meta = {}) {
      if (process.env.NODE_ENV === 'development') {
        console.log(this.formatMessage('DEBUG', message, meta));
      }
    }
  }
  
  module.exports = { Logger };