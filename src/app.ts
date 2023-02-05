import dotenv from 'dotenv';
import { createCursor, getRandomPagePoint, installMouseHelper } from 'ghost-cursor';
import fs from 'fs';

import { WinstonLogger, buildConfigWithDefaults } from './utils';
import { ChromeInstance } from './helpers';
import type { BaseLogger } from './utils';
import type { IFlightResponse, IFlight } from './types/flights';

// Configure environmental variables
dotenv.config();

interface IAppConfig {
    debug: boolean;
}

export class App {
    private _chromeInstance: ChromeInstance;
    private readonly _config: IAppConfig;
    private readonly _logger: BaseLogger;
    private _flights: IFlight[] = [];
    private readonly flightNumber: string = '999';

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

    public async checkDate(origin: string, destination: string, date: string) {
        // Open Chrome
        this._logger.info('Launching Chrome...');
        await this._chromeInstance.launch();

        // Launch page
        const page = await this._chromeInstance.instance.newPage();
        const cursor = createCursor(page, await getRandomPagePoint(page), true);
        await installMouseHelper(page);
        // // Wait
        // await page.waitForTimeout(500);

        // Register listener
        page.on('response', async (response) => {
            if (
                response
                    .url()
                    .startsWith(
                        'https://www.united.com/ual/en/us/flight-search/book-a-flight/flightshopping/getflightresults/rev'
                    ) &&
                response.status() === 200
            ) {
                // TODO: Set typings
                const data = (await response.json()) as IFlightResponse;

                // Check for errors
                if (data.status !== 'success') {
                    this._logger.error(`Encountered errors: ${data.errors.join(', ')}`);
                }

                const remoteFlights = data.data.Trips[0]?.Flights;

                // Check for no flights
                if (!remoteFlights || !Array.isArray(remoteFlights)) {
                    this._logger.error('No flights found!');
                }

                // Store received flights
                for (const flight of remoteFlights) {
                    this._flights.push(flight);
                }

                this._logger.debug('Stored flights batch');
            }
        });

        // Navigate to page
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

        // // Click 1 stop
        // const oneWayOneStopElement = await page.evaluateHandle(() => {
        //     return document.querySelector('#Trips_0__OneStop');
        // });
        // await cursor.click(oneWayOneStopElement);

        // Wait
        await page.waitForTimeout(500);

        // Type itinerary after clicking each input 3 times to select all and overwrite any existing values
        await cursor.click('#Trips_0__Origin');
        await page.type('#Trips_0__Origin', origin, { delay: 600 });

        await cursor.click('#Trips_0__Destination');
        await page.type('#Trips_0__Destination', destination, { delay: 500 });

        await cursor.click('#Trips_0__DepartDate');
        await page.type('#Trips_0__DepartDate', date, {
            delay: 500
        });

        // Scroll to upgrade search filter dropdown
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
        await page.waitForTimeout(1100);

        // Search
        const searchElement = await page.evaluateHandle(() => {
            return document.querySelector('#btn-search');
        });
        await cursor.click(searchElement);

        // Wait for all results to load
        await page.waitForTimeout(10_000);

        // Close page
        //await page.close();
    }

    public async start() {
        type TUpgradableFlight = {
            [fareClass in 'PZ' | 'PN' | 'RN']: IFlight[];
        };

        const upgradableFlights: TUpgradableFlight = {
            PZ: [],
            PN: [],
            RN: []
        };

        // Fetch flights
        //await this.checkDate('EWR', 'TLV', '02/07/2023');

        // DEBUG
        this._flights = JSON.parse(fs.readFileSync('temp/flights-1675587451919.json', 'utf8'));

        this._logger.info(`Total flights found: ${this._flights.length}`);

        // DEBUG
        // this._logger.info(`[Main] Saving all flights to file...`);
        // const currentDateMs = Date.now();
        // fs.writeFileSync(`temp/flights-${currentDateMs}.json`, JSON.stringify(this._flights));
        // this._logger.debug(`[Main] Flights saved in temp/flights-${currentDateMs}.json`);

        // Close Chrome
        //this._logger.info('Closing Chrome...');
        //await this._chromeInstance.dispose();

        // Scan for upgradability
        this._logger.info('Scanning for upgrades...');
        for (const flight of this._flights) {
            // Check fare classes
            flight.BookingClassAvailList.forEach((fareClassQuantity) => {
                // Fare class code but without available quantity (e.g. PZ)
                const fareClass = fareClassQuantity.slice(0, -1);
                const upgradeClasses = [/PZ[1-9]/, /PN[1-9]/, /RN[1-9]/];

                for (const fcType of upgradeClasses) {
                    if (fareClassQuantity.match(fcType)?.[0]) {
                        upgradableFlights[fareClass].push(flight);
                    }
                }
            });
        }

        // Print results
        for (const classCode in upgradableFlights) {
            if (upgradableFlights[classCode].length > 0) {
                const flights: IFlight[] = upgradableFlights[classCode];
                this._logger.info(
                    `Found ${flights.length} total upgrade options for ${classCode}:`
                );

                for (const flight of upgradableFlights[classCode]) {
                    if (this.flightNumber && flight.FlightNumber !== this.flightNumber) continue;

                    console.log(
                        `Flight Number: ${flight.FlightNumber} | ${flight.Origin} -> ${
                            flight.Destination
                        } ${
                            // List layover, if exists
                            flight.Destination !== flight.LastDestination.Code
                                ? `-> ${flight.LastDestination.Code}`
                                : ''
                        }`
                    );
                    console.log(`Departure: ${flight.DepartDateTime}`);
                    console.log(`Arrival: ${flight.DestinationDateTime}`);
                    console.log(`Fare Class: ${classCode}`);
                    console.log('---');
                }
            } else {
                this._logger.info(`No upgrades found for ${classCode}.`);
            }
        }
    }
}
