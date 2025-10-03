/**
 * Logger utility para debugging y monitoreo
 * En producción se puede integrar con servicios como Sentry, LogRocket, etc.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private isEnabled = true;

  /**
   * Formatear mensaje con contexto
   */
  private format(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  /**
   * Enviar logs a servicio externo (Sentry, etc.)
   */
  private sendToMonitoring(_level: LogLevel, _message: string, _context?: LogContext) {
    // En producción, enviar a servicio de monitoring
    // Ejemplo con Sentry:
    // if (!this.isDevelopment && _level === 'error') {
    //   if (window.Sentry) {
    //     window.Sentry.captureMessage(_message, {
    //       level: _level as any,
    //       extra: _context,
    //     });
    //   }
    // }
  }

  /**
   * Log de debug (solo desarrollo)
   */
  debug(message: string, context?: LogContext) {
    if (!this.isEnabled || !this.isDevelopment) return;
    console.debug(this.format('debug', message, context));
  }

  /**
   * Log de información
   */
  info(message: string, context?: LogContext) {
    if (!this.isEnabled) return;
    console.info(this.format('info', message, context));
  }

  /**
   * Log de advertencia
   */
  warn(message: string, context?: LogContext) {
    if (!this.isEnabled) return;
    console.warn(this.format('warn', message, context));
    this.sendToMonitoring('warn', message, context);
  }

  /**
   * Log de error
   */
  error(message: string, error?: Error, context?: LogContext) {
    if (!this.isEnabled) return;

    const errorContext = {
      ...context,
      stack: error?.stack,
      errorMessage: error?.message,
    };

    console.error(this.format('error', message, errorContext));
    this.sendToMonitoring('error', message, errorContext);
  }

  /**
   * Log de métricas de performance
   */
  performance(metricName: string, duration: number, context?: LogContext) {
    if (!this.isDevelopment) return;

    console.log(this.format('info', `⏱️ ${metricName}: ${duration}ms`, context));
  }

  /**
   * Medir tiempo de ejecución de una función
   */
  async measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.performance(name, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.error(`${name} failed after ${duration}ms`, error as Error);
      throw error;
    }
  }

  /**
   * Desabilitar logs (útil para tests)
   */
  disable() {
    this.isEnabled = false;
  }

  /**
   * Habilitar logs
   */
  enable() {
    this.isEnabled = true;
  }
}

export const logger = new Logger();
