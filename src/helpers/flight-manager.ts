import { createCursor, getRandomPagePoint, installMouseHelper } from 'ghost-cursor';

import { WinstonLogger } from '../utils';
import type { BaseLogger } from '../utils';
import type { ChromeInstance } from '../helpers';
import type { IFlightResponse, IFlight } from '../types';

interface IFlightManagerConfig {
    chrome: ChromeInstance;
}

export class FlightManager {
    private readonly _config: IFlightManagerConfig;
    private readonly _logger: BaseLogger;

    constructor(config: IFlightManagerConfig) {
        // Set config
        this._config = config;

        // Configure logger
        this._logger = new WinstonLogger('Flight Manager').logger;
    }

    public async getFlights(origin: string, destination: string, date: string): Promise<IFlight[]> {
        const flights: IFlight[] = [];

        // Open Chrome
        this._logger.debug('Launching chrome...');
        await this._config.chrome.launch();

        // Launch page
        this._logger.debug('Opening page...');
        const page = await this._config.chrome.instance.newPage();
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

                this._logger.debug('Flight batch acquired');
            }
        });

        // Clear browser cookies
        const client = await page.target().createCDPSession();
        await client.send('Network.clearBrowserCookies');
        await client.detach();

        // Navigate to page
        this._logger.debug('Navigating...');
        await page.goto('https://www.united.com/ual/en/us/flight-search/book-a-flight', {
            waitUntil: 'networkidle0'
        });

        // Click one way, and keep trying if cursor missed the button
        const clickOneWay = async () => {
            // Click one way
            this._logger.debug('Clicking one way...');
            const oneWayElement = await page.evaluateHandle(() => {
                return document.querySelector('#TripTypes_ow');
            });
            // @ts-ignore
            await cursor.click(oneWayElement);

            // Ensure button was selected, otherwise recurse
            const isOneWaySelected: boolean = await page.evaluate(() => {
                const oneWayRadioButton: HTMLInputElement = document.querySelector('#TripTypes_ow');
                return oneWayRadioButton.checked;
            });

            if (!isOneWaySelected) {
                this._logger.debug('Missed button, retrying...');
                await clickOneWay();
            }
        };
        await clickOneWay();

        // Wait
        await page.waitForTimeout(500);

        // Type itinerary after clicking each input 3 times to select all and overwrite any existing values
        this._logger.debug('Typing origin...');

        await cursor.click('#Trips_0__Origin');
        await page.type('#Trips_0__Origin', origin, { delay: 500 });

        this._logger.debug('Typing destination...');
        await cursor.click('#Trips_0__Destination');
        await page.type('#Trips_0__Destination', destination, { delay: 500 });

        this._logger.debug('Typing departure date...');
        await cursor.click('#Trips_0__DepartDate');
        await page.type('#Trips_0__DepartDate', date, { delay: 500 });

        // Scroll to upgrade search filter dropdown
        // TODO: Remove because unnecessary?
        this._logger.debug('Scrolling...');
        await page.evaluate(() => {
            const dropdown = document.querySelector('#select-upgrade-type');
            dropdown.scrollIntoView({
                behavior: 'smooth',
                block: 'end',
                inline: 'end'
            });
        });

        // Select upgrade search
        this._logger.debug('Selecting upgrade type...');
        await page.select('#select-upgrade-type', 'MUA');

        // Fix focus
        await cursor.click('#fare-preference');
        await page.focus('#ClassofService');

        // Wait
        await page.waitForTimeout(1000);

        // Search
        this._logger.debug('Searching...');
        const searchElement = await page.evaluateHandle(() => {
            return document.querySelector('#btn-search');
        });
        // @ts-ignore
        await cursor.click(searchElement);

        // Wait for all results to load
        await page.waitForNavigation();
        await page.waitForNetworkIdle({ idleTime: 3000 });

        // Stop ghost cursor
        cursor.toggleRandomMove(false);
        await page.waitForTimeout(2000);

        // Close page
        this._logger.debug('Closing page...');
        await page.close();

        return flights;
    }

    public getSpecificFlight(flightNumber: string, flights: IFlight[]): IFlight {
        const targetFlight = flights.find((flight) => flight.FlightNumber === flightNumber);

        return targetFlight;
    }
}
