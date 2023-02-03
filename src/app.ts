import dotenv from 'dotenv';

import { WinstonLogger, buildConfigWithDefaults } from './utils';
import { ChromeInstance } from './helpers';
import type { BaseLogger } from './utils';

// Configure environmental variables
dotenv.config();

interface IAppConfig {
    debug: boolean;
}

export class App {
    private _chromeInstance: ChromeInstance;
    private readonly _config: IAppConfig;
    private readonly _logger: BaseLogger;

    constructor(config?: IAppConfig) {
        // Set config defaults, then override with any provided values
        this._config = buildConfigWithDefaults(config, {
            debug: process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
        });

        // Create Chrome instance
        this._chromeInstance = new ChromeInstance({
            userDataDir: process.env.CHROME_USER_DATA_FOLDER,
            debug: this._config.debug
        });

        // Configure class-wide logger
        this._logger = new WinstonLogger('Main').logger;
    }

    public async start() {
        // Open Chrome
        this._logger.info('Launching Chrome...');
        await this._chromeInstance.launch();

        // Navigate to page
        const page = await this._chromeInstance.instance.newPage();
        await page.goto('https://www.united.com/ual/en/us/flight-search/book-a-flight', {
            waitUntil: 'networkidle0'
        });

        // Click one way stuff
        await page.evaluate(() => {
            const $oneWayButton = document.querySelector('#TripTypes_ow') as HTMLElement;
            $oneWayButton.click();

            const $oneWayNonStopButton = document.querySelector('#Trips_0__NonStop') as HTMLElement;
            $oneWayNonStopButton.click();

            const $oneWayOneStopButton = document.querySelector('#Trips_0__OneStop') as HTMLElement;
            $oneWayOneStopButton.click();

            const $oneWayTwoPlusStopButton = document.querySelector(
                '#Trips_0__TwoPlusStop'
            ) as HTMLElement;
            $oneWayTwoPlusStopButton.click();
        });

        // Timeout 100ms?

        // Type itinerary
        await page.click('#Trips_0__Origin', { clickCount: 3 });
        await page.type('#Trips_0__Origin', 'EWR', { delay: 100 });

        await page.click('#Trips_0__Destination', { clickCount: 3 });
        await page.type('#Trips_0__Destination', 'PHX', { delay: 100 });

        await page.click('#Trips_0__DepartDate', { clickCount: 3 });
        await page.type('#Trips_0__DepartDate', '02/04/2023', {
            delay: 100
        });

        // Select upgrade search
        await page.select('#select-upgrade-type', 'MUA');

        // Fix focus
        await page.click('#fare-preference');
        await page.focus('#ClassofService');

        // Search
        await page.evaluate(() => {
            const $submitButton = document.querySelector('#btn-search') as HTMLElement;
            $submitButton.click();
        });
    }
}
