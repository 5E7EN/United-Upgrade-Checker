import twilio, { Twilio } from 'twilio';

import { WinstonLogger, buildConfigWithDefaults } from '../utils';
import type { BaseLogger } from '../utils';

interface ISmsProviderConfig {
    authID: string;
    authToken: string;
    fromNumber: string;
    toNumber: string;
    ownerNumber?: string;
}

export class SmsProvider {
    private readonly _config: ISmsProviderConfig;
    private readonly _client: Twilio;
    private readonly _logger: BaseLogger;

    constructor(config?: ISmsProviderConfig) {
        // Set config
        this._config = buildConfigWithDefaults(config, {
            authID: process.env.TWILIO_AUTH_ID,
            authToken: process.env.TWILIO_AUTH_TOKEN,
            fromNumber: process.env.TWILIO_FROM_NUMBER,
            toNumber: process.env.TWILIO_TO_NUMBER,
            ownerNumber: process.env.TWILIO_OWNER_NUMBER
        });

        // Configure SMS client
        this._client = twilio(this._config.authID, this._config.authToken);

        // Configure logger
        this._logger = new WinstonLogger('SMS Provider').logger;
    }

    public async send(content: string) {
        // Send owner SMS alert, if phone number provided
        if (this._config.ownerNumber) {
            this._logger.debug(`Sending owner alert -> ${this._config.ownerNumber}`);

            await this._client.messages.create({
                body: content,
                from: this._config.fromNumber,
                to: this._config.ownerNumber
            });
        }

        // Send main SMS
        this._logger.debug(`Sending main alert -> ${this._config.toNumber}`);
        const message = await this._client.messages.create({
            body: content,
            from: this._config.fromNumber,
            to: this._config.toNumber
        });

        return message;
    }
}
