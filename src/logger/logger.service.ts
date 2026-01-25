import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';

@Injectable()
export class LoggerService implements NestLoggerService {
  log(message: string, context?: string) {
    console.log(this.format('LOG', message, context));
  }

  error(message: string, trace?: string, context?: string) {
    console.error(this.format('ERROR', message, context), trace);
  }

  warn(message: string, context?: string) {
    console.warn(this.format('WARN', message, context));
  }

  debug(message: string, context?: string) {
    console.debug(this.format('DEBUG', message, context));
  }

  verbose(message: string, context?: string) {
    console.info(this.format('VERBOSE', message, context));
  }

  private format(level: string, message: string, context?: string) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}]${context ? ' [' + context + ']' : ''} ${message}`;
  }
}
