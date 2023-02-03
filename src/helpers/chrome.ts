import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type { Browser } from 'puppeteer';

import { buildConfigWithDefaults } from '../utils';

interface IChromeInstanceConfig {
    userDataDir?: string;
    debug?: boolean;
}

export class ChromeInstance {
    public instance: Browser;
    private readonly _config: IChromeInstanceConfig;

    public constructor(config?: IChromeInstanceConfig) {
        // Set config defaults, then override with any provided values
        this._config = buildConfigWithDefaults(config, {
            debug: process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
        });
    }

    public async launch(): Promise<void> {
        // Launch instance if it's the first time calling, or if the instance doesn't have an attached browser
        if (typeof this.instance === 'undefined' || this.instance.isConnected() === false) {
            puppeteer.use(StealthPlugin());

            const instance = await puppeteer.launch({
                headless: !this._config.debug,
                args: [
                    '--no-sandbox',
                    '--disable-gpu',
                    '--disable-dev-shm-usage',
                    '--disable-setuid-sandbox',
                    '--no-first-run',
                    '--no-zygote'
                ],

                // Persist user sessions
                userDataDir: this._config.userDataDir
            });

            this.instance = instance;
        }
    }

    public async dispose(): Promise<void> {
        // Ensure there is an active chrome browser
        if (typeof this.instance !== 'undefined' && this.instance.isConnected() === true) {
            // Close chrome
            await this.instance.close();
        }
    }
}
