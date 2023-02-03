import chalk from 'chalk';
import winston, { createLogger, format, transports } from 'winston';
import type { Logger } from 'winston';

export enum ELogLevel {
    SILLY = 'silly',
    DEBUG = 'debug',
    INFO = 'info',
    WARNING = 'warning',
    ERROR = 'error'
}

interface ITransformableInfo {
    level: string;
    message: string;
    [key: string]: string;
}

export type BaseLogger = Logger;

export class WinstonLogger {
    private readonly _contextTag: string;
    private readonly _logLevel: ELogLevel;
    private readonly _logger: Logger;

    constructor(contextTag?: string, logLevel?: ELogLevel) {
        let envLevel: ELogLevel;

        if (process.env.LOG_LEVEL && process.env.LOG_LEVEL in ELogLevel) {
            envLevel = ELogLevel[process.env.LOG_LEVEL] as ELogLevel;
        }

        // Log level priority:
        // global env -> desired initialization value -> environmental defaults
        this._logLevel =
            envLevel ||
            logLevel ||
            (process.env.NODE_ENV === 'production' ? ELogLevel.INFO : ELogLevel.DEBUG);

        // Set context tag - example result: [Context Tag]
        this._contextTag = contextTag;

        // Configure logger instance
        this._logger = createLogger({
            format: format.json(),
            level: this._logLevel,
            transports: [
                new transports.Console({
                    format: format.printf((info: ITransformableInfo): string => {
                        const NPMColors = winston.config.npm.colors;
                        const colors = NPMColors[info.level];
                        const color = Array.isArray(colors) ? colors[0] : colors;

                        // Set context tag, and append extender, if defined
                        const contextTagExtension = info.message.match(/^\[(.*?)]/) || [];
                        const contextTag =
                            contextTagExtension.length !== 0
                                ? this._contextTag
                                    ? this._contextTag + ' | ' + contextTagExtension[1]
                                    : contextTagExtension[1]
                                : this._contextTag;

                        const message: string[] = [
                            chalk.gray(new Date().toLocaleString()),
                            chalk[color](info.level.toUpperCase().padEnd(7)),
                            contextTag ? chalk.yellow(`[${contextTag}]`.padEnd(16)) + ' -' : '',
                            info.message.replace(/^\[.*?]( )/, ''),
                            chalk.gray(JSON.stringify(info.object, null, 2) || '')
                        ];

                        return message.join(' ').trim();
                    })
                })
            ]
        });
    }

    public get logger() {
        return this._logger;
    }
}
