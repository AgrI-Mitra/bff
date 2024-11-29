// loki-logger.service.ts

import { Logger, LoggerService } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

export class LokiLogger extends Logger implements LoggerService {
  private readonly httpService: HttpService;
  private readonly configService: ConfigService;
  private readonly serviceName: string;

  constructor(
    context: string,
    httpService: HttpService,
    configService: ConfigService,
  ) {
    super(context);
    this.httpService = httpService;
    this.configService = configService;
    this.serviceName = context;
  }

  private static formatTimestamp(date: Date): string {
    const hours = date.getHours();
    const hours12 = hours % 12 || 12;
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
    const milliseconds = date.getMilliseconds().toString().padStart(3, "0");
    const amPm = hours >= 12 ? "PM" : "AM";

    return `${hours12}:${minutes}:${seconds}.${milliseconds} ${amPm}`;
  }

  private static combineLogs(params: any[]): string {
    return params?.map(param => {
      try {
        param = JSON.stringify(param,null,2)
      } catch {
        param = param
      }
      return param
    }).join(" ")
  }

  private formatLog(level, params) {
    const timestamp = LokiLogger.formatTimestamp(new Date());
    return {
      level,
      message: LokiLogger.combineLogs(params),
      service: this.serviceName,
      timestamp
    }
  }

  log(
    message: any,
    trace?: string,
    context?: string,
  ) {
    super.log(message);
    this.pushToLoki('info', message, context, trace);
  }

  error(
    message: any,
    trace?: string,
    context?: string,
  ) {
    super.error(message, trace, context);
    this.pushToLoki('error', message, context, trace);
  }

  warn(
    message: any,
    trace?: string,
    context?: string,
  ) {
    super.warn(message, context);
    this.pushToLoki('warn', message, context, trace);
  }

  debug(
    message: any,
    trace?: string,
    context?: string
  ) {
    super.debug(message, context);
    this.pushToLoki('debug', message, context, trace);
  }

  verbose(
    message: any,
    trace?: string,
    context?: string
  ) {
    super.verbose(message, context);
    this.pushToLoki('verbose', message, context, trace);
  }

  private async pushToLoki(
    level: string,
    message: any,
    context?: string,
    trace?: string,
  ) {
    const timestamp = Date.now() * 1e6; // Convert to nanoseconds
    const logEntry = {
      level,
      message: typeof message === 'object' ? JSON.stringify(message) : message,
      context: context || this.context,
      trace,
      env: process.env.NODE_ENV
    };

    const logs = {
      streams: [
        {
          stream: {
            level,
            app: this.serviceName
          },
          values: [[timestamp.toString(), JSON.stringify(logEntry)]],
        },
      ],
    };
    const LokiURL = this.configService.get<string>('GRAFANA_URL');
    try {
      await firstValueFrom(
        this.httpService
          .post(LokiURL, logs, {
            headers: {
              'Content-Type': 'application/json',
            },
          })
          .pipe(
            catchError((error: AxiosError) => {
              console.error(
                'Error pushing logs to Loki:',
                error.response?.data,
              );
              throw error;
            }),
          ),
      );
    } catch (error) {
      console.error('Failed to push logs to Loki:', error);
    }
  }

  logToLokiAndConsole(logData) {
    let customFieldsString = '';
    if (logData.customFields) {
      customFieldsString = Object.entries(logData.customFields)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
    }
    switch(logData.level) {
      case "info":
        this.log(`${customFieldsString} ${logData?.message}`, this.serviceName, logData?.timestamp);
        break;
      case "error":
        this.error(`${customFieldsString} ${logData?.message}`, this.serviceName, logData?.timestamp);
        break;
      case "warn":
        this.warn(`${customFieldsString} ${logData?.message}`, this.serviceName, logData?.timestamp);
        break;
      case "debug":
        this.debug(`${customFieldsString} ${logData?.message}`, this.serviceName, logData?.timestamp);
        break;
      case "verbose":
        this.verbose(`${customFieldsString} ${logData?.message}`, this.serviceName, logData?.timestamp);
        break;
      default:
        this.log(`${customFieldsString} ${logData?.message}`, this.serviceName, logData?.timestamp);
        break;
    }
  }

  logWithCustomFields(customFields, level="info") {
    return (...params: any[]) => {
      let logData = this.formatLog(level,params)
      logData = {
        ...customFields,
        ...logData
      }
      this.logToLokiAndConsole(logData)
    }
  }
}
