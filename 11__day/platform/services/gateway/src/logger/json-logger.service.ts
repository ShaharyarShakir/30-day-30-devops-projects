import { Injectable, LoggerService, Scope } from "@nestjs/common";
import pino from "pino";

@Injectable({ scope: Scope.TRANSIENT })
export class JsonLoggerService implements LoggerService {
  private readonly logger = pino({
    level: process.env.LOG_LEVEL || "info",
    base: { service: "gateway" },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label })
    }
  });

  log(message: any, context?: string) {
    if (typeof message === "object") {
      this.logger.info({ context, ...message });
    } else {
      this.logger.info({ context }, message);
    }
  }

  error(message: any, trace?: string, context?: string) {
    if (typeof message === "object") {
      this.logger.error({ context, stack: trace, ...message });
    } else {
      this.logger.error({ context, stack: trace }, message);
    }
  }

  warn(message: any, context?: string) {
    if (typeof message === "object") {
      this.logger.warn({ context, ...message });
    } else {
      this.logger.warn({ context }, message);
    }
  }

  debug(message: any, context?: string) {
    if (typeof message === "object") {
      this.logger.debug({ context, ...message });
    } else {
      this.logger.debug({ context }, message);
    }
  }

  verbose(message: any, context?: string) {
    if (typeof message === "object") {
      this.logger.trace({ context, ...message });
    } else {
      this.logger.trace({ context }, message);
    }
  }
}
