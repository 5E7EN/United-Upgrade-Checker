import dotenv from 'dotenv';

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

        // Click one way stuff
        await page.evaluate(() => {
            const $oneWayButton = document.querySelector('#TripTypes_ow') as HTMLElement;
            $oneWayButton.click();

            const $oneWayNonStopButton = document.querySelector('#Trips_0__NonStop') as HTMLElement;
            $oneWayNonStopButton.click();

            const $oneWayOneStopButton = document.querySelector('#Trips_0__OneStop') as HTMLElement;
            $oneWayOneStopButton.click();

            // const $oneWayTwoPlusStopButton = document.querySelector(
            //     '#Trips_0__TwoPlusStop'
            // ) as HTMLElement;
            // $oneWayTwoPlusStopButton.click();
        });

        // Wait
        await page.waitForTimeout(500);

        // Type itinerary after clicking each input 3 times to select all and overwrite any existing values
        await page.click('#Trips_0__Origin', { clickCount: 3 });
        await page.type('#Trips_0__Origin', origin, { delay: 100 });

        await page.click('#Trips_0__Destination', { clickCount: 3 });
        await page.type('#Trips_0__Destination', destination, { delay: 100 });

        await page.click('#Trips_0__DepartDate', { clickCount: 3 });
        await page.type('#Trips_0__DepartDate', date, {
            delay: 100
        });

        // Select upgrade search
        await page.select('#select-upgrade-type', 'MUA');

        // Fix focus
        await page.click('#fare-preference');
        await page.focus('#ClassofService');

        // Wait
        await page.waitForTimeout(500);

        // Search
        await page.evaluate(() => {
            const $submitButton = document.querySelector('#btn-search') as HTMLElement;
            $submitButton.click();
        });

        // Wait for all results to load
        await page.waitForTimeout(10_000);

        // Close page
        await page.close();

        // Close Chrome
        this._logger.info('Closing Chrome...');
        await this._chromeInstance.dispose();
    }

    public async start() {
        interface IUpgradableFlight {
            fareClass: string;
            flight: IFlight;
        }

        const upgradableFlights: IUpgradableFlight[] = [];

        // Fetch flights
        await this.checkDate('EWR', 'PHX', '02/04/2023');
        this._logger.info(`Total flights found: ${this._flights.length}`);

        // Scan for upgradability
        this._logger.info('Scanning for upgrades...');
        for (const flight of this._flights) {
            // Check fare classes
            flight.BookingClassAvailList.forEach((fareClass) => {
                // TODO: Refactor
                const matchesPz = fareClass.match(/PZ[1-9]/);
                const matchesPn = fareClass.match(/PN[1-9]/);

                if (matchesPz?.[0]) {
                    upgradableFlights.push({ fareClass: fareClass, flight });
                }

                if (matchesPn?.[0]) {
                    upgradableFlights.push({ fareClass: fareClass, flight });
                }
            });
        }

        // Print results
        if (upgradableFlights.length > 0) {
            this._logger.info(`Found ${upgradableFlights.length} total upgrade options:`);

            upgradableFlights.forEach(({ fareClass, flight }) => {
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
                console.log(`Fare Class: ${fareClass}`);
                console.log('---');
            });
        }
    }
}
