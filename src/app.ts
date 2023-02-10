import twilio, { Twilio } from 'twilio';
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
    twilio: {
        authID: string;
        authToken: string;
        fromNumber: string;
        toNumber: string;
        ownerNumber: string;
    };
    debug?: boolean;
    savedJobsFile?: string;
}

interface IItinerary {
    origin: string;
    destination: string;
    departureDate: string;
    flightNumber: string;
    targetClass: string;
}

interface IJob {
    username: string;
    email: string;
    phone: string;
    itinerary: IItinerary;
}

interface IJobResult {
    job: IJob;
    flight: IFlight;
    error?: string;
}

export class App {
    private readonly _chromeInstance: ChromeInstance;
    private readonly _smsClient: Twilio;
    private readonly _config: IAppConfig;
    private readonly _logger: BaseLogger;
    private readonly _upgradableClasses = [/PZ([1-9])/, /PN([1-9])/, /RN([1-9])/];
    private jobs: IJob[] = [];

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

        // Configure SMS notifier
        this._smsClient = twilio(this._config.twilio.authID, this._config.twilio.authToken);

        // Add job
        // TODO: Use parameters
        // Upgradable
        this.jobs.push({
            username: '5E7EN',
            email: '5e7en7@protonmail.com',
            phone: this._config.twilio.ownerNumber, // TODO: Change from owner number
            itinerary: {
                origin: 'EWR',
                destination: 'TLV',
                departureDate: '02/13/2023',
                flightNumber: '999',
                targetClass: 'PZ'
            }
        });

        // Not upgradable
        this.jobs.push({
            username: '5E7EN',
            email: '5e7en7@protonmail.com',
            phone: this._config.twilio.ownerNumber, // TODO: Change from owner number
            itinerary: {
                origin: 'EWR',
                destination: 'TLV',
                departureDate: '02/11/2023',
                flightNumber: '84',
                targetClass: 'PZ'
            }
        });

        // Not upgradable
        this.jobs.push({
            username: '5E7EN',
            email: '5e7en7@protonmail.com',
            phone: this._config.twilio.ownerNumber, // TODO: Change from owner number
            itinerary: {
                origin: 'EWR',
                destination: 'TLV',
                departureDate: '02/11/2023',
                flightNumber: '84',
                targetClass: 'PZ'
            }
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
            const isOneWaySelected = await page.evaluateHandle(() => {
                const oneWayRadioButton: HTMLInputElement = document.querySelector(
                    '#TripTypes_ow'
                ) as any;
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

    public async checkUpgradability(targetFlight: IFlight) {
        // TODO: Group away from declerative typing
        const upgradableFlights: { fareClass: string; quantity: number }[] = [];

        // Scan for upgradability
        this._logger.info('Scanning for upgradability...');

        // Iterate available fair classes and determine availability
        for (const fareClassQuantity of targetFlight.BookingClassAvailList) {
            // Parse fare class code excluding quantity (e.g. PZ, not PZ4)
            const fareClass = fareClassQuantity.slice(0, -1);

            // Iterate fair class regexes and check for matches
            // TODO: Move away from regex-based determination
            for (const classRegex of this._upgradableClasses) {
                if (fareClassQuantity.match(classRegex)?.[0]) {
                    const quantity = fareClassQuantity.match(classRegex)?.[1];

                    upgradableFlights.push({ fareClass, quantity: Number(quantity) });
                }
            }
        }

        return upgradableFlights;
    }

    public async sendSms(to: string, content: string) {
        // Send master SMS alert
        await this._smsClient.messages.create({
            body: content,
            from: this._config.twilio.fromNumber,
            to: this._config.twilio.ownerNumber
        });

        // Send main SMS
        const message = await this._smsClient.messages.create({
            body: content,
            from: this._config.twilio.fromNumber,
            to
        });

        return message;
    }

    public async executeJobs(jobs: IJob[]): Promise<IJobResult[]> {
        const jobResults: IJobResult[] = [];

        // Iterate all jobs and retrieve flights
        for (let [jobIndex, job] of jobs.entries()) {
            let targetFlight: IFlight;
            let jobError: string = null;
            jobIndex = jobIndex + 1;

            this._logger.info(`Execute job #${jobIndex}...`);

            try {
                // Get flights
                const flights = await this.getFlights(
                    job.itinerary.origin,
                    job.itinerary.destination,
                    job.itinerary.departureDate
                );
                this._logger.debug(`[Job #${jobIndex}] Total flights found: ${flights.length}`);

                // Single out target flight via flight number
                targetFlight = this.getSpecificFlight(job.itinerary.flightNumber, flights);
            } catch (error) {
                jobError = error.message || error;
            }

            // Ensure flight has been found
            if (!targetFlight || !targetFlight?.FlightNumber) {
                this._logger.warn(
                    `[Job #${jobIndex}] Unable to locate target flight: ${targetFlight.FlightNumber}`
                );
                jobError = 'Unable to locate desired flight';
            } else {
                this._logger.debug(
                    `[Job #${jobIndex}] Located target flight: UA ${targetFlight.FlightNumber}`
                );
            }

            // Add job meta, flight object, and possible errors to results
            jobResults.push({
                job,
                flight: targetFlight,
                error: jobError
            });
        }

        // Keep local record of completed jobs
        this._logger.debug(`Saving all job results to file...`);
        const currentDateMs = Date.now();
        fs.writeFileSync(`temp/jobs-${currentDateMs}.json`, JSON.stringify(jobResults));
        this._logger.debug(`Flights saved in temp/jobs-${currentDateMs}.json`);

        return jobResults;
    }

    public async start() {
        const jobResults: IJobResult[] = [];

        // If file is provided, retrieve already fetched jobs from disk
        if (this._config.savedJobsFile) {
            // Ensure local file exists, then read it
            if (fs.existsSync(this._config.savedJobsFile)) {
                this._logger.debug(
                    `Reading local job results file ${this._config.savedJobsFile}...`
                );

                const contents = fs.readFileSync(this._config.savedJobsFile, 'utf8');
                const parsed = JSON.parse(contents) as IJobResult[];
                jobResults.push(...parsed);
            } else {
                this._logger.error(
                    `Local job results file does not exist -> ${this._config.savedJobsFile}`
                );
            }
        } else {
            const results = await this.executeJobs(this.jobs);
            jobResults.push(...results);

            // Close Chrome
            this._logger.debug('Closing chrome...');
            await this._chromeInstance.dispose();
        }

        // Ensure job results have been loaded
        if (jobResults.length === 0) {
            this._logger.warn('No job results found');
            return { found: false };
        }

        // Iterate each job and check for upgrade availability
        for (const { job: jobMeta, flight, error } of jobResults) {
            if (error) {
                this._logger.error(`Encountered error while retrieving flights: ${error}`);
                this._logger.error('Skipping...');
                continue;
            }

            // Check for upgradability
            const upgradability = await this.checkUpgradability(flight);

            // Ensure upgradability result includes target fare class
            if (
                upgradability.length === 0 ||
                !upgradability.some(({ fareClass }) => fareClass === jobMeta.itinerary.targetClass)
            ) {
                this._logger.info('No upgradability found for desired fare class');
                continue;
            }

            // Iterate upgrade opportunities and send notification
            for (const { fareClass, quantity } of upgradability) {
                // Skip if not desired target class
                if (jobMeta.itinerary.targetClass && fareClass !== jobMeta.itinerary.targetClass) {
                    continue;
                }

                // Log success to console
                console.log(chalk.green('UPGRADE AVAILABLE!'));
                console.log(chalk.yellow('Fare class: ' + chalk.magenta(fareClass)));
                console.log(
                    chalk.yellow(
                        'Quantity: ' +
                            (Number(quantity) < 3 ? chalk.red(quantity) : chalk.cyan(quantity))
                    )
                );
                console.log('---');

                // Send SMS notification
                await this.sendSms(
                    jobMeta.phone,
                    `Found upgrade availability for flight UA ${flight.FlightNumber} on ${jobMeta.itinerary.departureDate}.\nFare class: ${fareClass}\nQuantity: ${quantity}`
                );
            }
        }
    }
}
