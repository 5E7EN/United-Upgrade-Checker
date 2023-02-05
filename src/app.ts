import dotenv from 'dotenv';
import { createCursor, getRandomPagePoint, installMouseHelper } from 'ghost-cursor';
import chalk from 'chalk';
import fs from 'fs';

import { WinstonLogger, buildConfigWithDefaults } from './utils';
import { ChromeInstance } from './helpers';
import type { BaseLogger } from './utils';
import type { IFlightResponse, IFlight } from './types/flights';

// Configure environmental variables
dotenv.config();

interface IAppConfig {
    debug?: boolean;
    savedFlightsFile?: string;
}

export class App {
    private readonly _chromeInstance: ChromeInstance;
    private readonly _config: IAppConfig;
    private readonly _logger: BaseLogger;
    private readonly upgradableClasses = [/PZ([1-9])/, /PN([1-9])/, /RN([1-9])/];
    private flightNumber: string = '999';

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

    public async getFlights(origin: string, destination: string, date: string): Promise<IFlight[]> {
        const flights: IFlight[] = [];

        // Open Chrome
        this._logger.debug('Launching chrome...');
        await this._chromeInstance.launch();

        // Launch page
        this._logger.debug('Opening page...');
        const page = await this._chromeInstance.instance.newPage();
        const cursor = createCursor(page, await getRandomPagePoint(page), true);
        await installMouseHelper(page);

        // Register listener to parse flights API response
        page.on('response', async (response) => {
            if (
                response
                    .url()
                    .startsWith(
                        'https://www.united.com/ual/en/us/flight-search/book-a-flight/flightshopping/getflightresults/rev'
                    ) &&
                response.status() === 200
            ) {
                // Parse response
                const data = (await response.json()) as IFlightResponse;

                // Check for API-native errors
                if (data.status !== 'success') {
                    this._logger.error(`Encountered errors: ${data.errors.join(', ')}`);
                }

                // Store remote flights
                const remoteFlights = data.data.Trips[0]?.Flights;

                // Ensure we got some flight results, and store them
                if (!remoteFlights || !Array.isArray(remoteFlights)) {
                    this._logger.warn('No flights found in batch');
                } else {
                    flights.push(...remoteFlights);
                }

                this._logger.debug('Batch acquired');
            }
        });

        // Navigate to page
        this._logger.debug('Navigating...');
        await page.goto('https://www.united.com/ual/en/us/flight-search/book-a-flight', {
            waitUntil: 'networkidle0'
        });

        // Click one way
        const oneWayElement = await page.evaluateHandle(() => {
            return document.querySelector('#TripTypes_ow');
        });
        await cursor.click(oneWayElement);

        // Click non stop
        const oneWayNonStopElement = await page.evaluateHandle(() => {
            return document.querySelector('#Trips_0__NonStop');
        });
        await cursor.click(oneWayNonStopElement);

        // Click 1 stop
        const oneWayOneStopElement = await page.evaluateHandle(() => {
            return document.querySelector('#Trips_0__OneStop');
        });
        await cursor.click(oneWayOneStopElement);

        // Click 2+ stops
        const oneWayTwoStopElement = await page.evaluateHandle(() => {
            return document.querySelector('#Trips_0__TwoPlusStop');
        });
        await cursor.click(oneWayTwoStopElement);

        // Wait
        await page.waitForTimeout(500);

        // Type itinerary after clicking each input 3 times to select all and overwrite any existing values
        await cursor.click('#Trips_0__Origin');
        await page.type('#Trips_0__Origin', origin, { delay: 500 });

        await cursor.click('#Trips_0__Destination');
        await page.type('#Trips_0__Destination', destination, { delay: 500 });

        await cursor.click('#Trips_0__DepartDate');
        await page.type('#Trips_0__DepartDate', date, { delay: 500 });

        // Scroll to upgrade search filter dropdown
        // TODO: Remove because unnecessary?
        await page.evaluate(() => {
            const dropdown = document.querySelector('#select-upgrade-type');
            dropdown.scrollIntoView({ behavior: 'smooth' });
        });

        // Select upgrade search
        await page.select('#select-upgrade-type', 'MUA');

        // Fix focus
        await cursor.click('#fare-preference');
        await page.focus('#ClassofService');

        // Wait
        await page.waitForTimeout(1000);

        // Search
        const searchElement = await page.evaluateHandle(() => {
            return document.querySelector('#btn-search');
        });
        await cursor.click(searchElement);

        // Wait for all results to load
        await page.waitForNavigation();
        await page.waitForNetworkIdle({ idleTime: 3000 });

        // Close page
        this._logger.debug('Closing page...');
        await page.close();

        // Close Chrome
        this._logger.debug('Closing chrome...');
        await this._chromeInstance.dispose();

        // Keep local record of retrieved flights
        this._logger.info(`[Main] Saving all flights to file...`);
        const currentDateMs = Date.now();
        fs.writeFileSync(`temp/flights-${currentDateMs}.json`, JSON.stringify(flights));
        this._logger.debug(`[Main] Flights saved in temp/flights-${currentDateMs}.json`);

        return flights;
    }

    public async start() {
        const allFlights: IFlight[] = [];

        // If file is provided, retrieve already queried flights from disk
        if (this._config.savedFlightsFile) {
            // Ensure local file exists, then read it
            if (fs.existsSync(this._config.savedFlightsFile)) {
                this._logger.debug(
                    `Reading local flights file ${this._config.savedFlightsFile}...`
                );

                const contents = fs.readFileSync(this._config.savedFlightsFile, 'utf8');
                const parsed = JSON.parse(contents) as IFlight[];
                allFlights.push(...parsed);
            } else {
                this._logger.error(
                    `Local flights file does not exist -> ${this._config.savedFlightsFile}`
                );
            }
        } else {
            // Query / fetch for all available flights
            // TODO: Un-hardcode itinerary details
            const remoteFlights = await this.getFlights('EWR', 'TLV', '02/07/2023');
            allFlights.push(...remoteFlights);
        }

        // Ensure flights have been loaded
        if (allFlights.length === 0) {
            return this._logger.error('No flights found');
        }

        this._logger.debug(`Total flights found: ${allFlights.length}`);

        // Get target flight
        const targetFlight = allFlights.find((flight) => flight.FlightNumber === this.flightNumber);

        // Ensure flight has been found
        if (!targetFlight) {
            return this._logger.error('Unable to locate desired flight');
        }

        // Scan for upgradability
        this._logger.debug('Scanning for upgradability...');

        // Iterate available fair classes and determine availability
        for (const fareClassQuantity of targetFlight.BookingClassAvailList) {
            // Parse fare class code excluding quantity (e.g. PZ, not PZ4)
            const fareClass = fareClassQuantity.slice(0, -1);

            // Iterate fair class regexes and check for matches
            // TODO: Move away from regex-based determination
            for (const classRegex of this.upgradableClasses) {
                if (fareClassQuantity.match(classRegex)?.[0]) {
                    const quantity = fareClassQuantity.match(classRegex)?.[1];

                    console.log(chalk.green('UPGRADE AVAILABLE!'));
                    console.log(chalk.yellow('Fare class: ' + chalk.magenta(fareClass)));
                    console.log(
                        chalk.yellow(
                            'Quantity: ' +
                                (Number(quantity) < 3 ? chalk.red(quantity) : chalk.cyan(quantity))
                        )
                    );
                    console.log('---');
                }
            }
        }
    }
}
