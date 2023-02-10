import dotenv from 'dotenv';
import chalk from 'chalk';
import fs from 'fs';
import twilio, { Twilio } from 'twilio';

import { FlightManager } from './helpers';
import { SmsProvider } from './providers';

import { WinstonLogger, buildConfigWithDefaults, addDaysToDate } from './utils';
import { ChromeInstance } from './helpers';
import type { BaseLogger } from './utils';
import type { IFlight } from './types/flights';

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

export interface IJob {
    phone: string;
    itinerary: IItinerary;
    completed: boolean;
}

interface IJobResult {
    job: IJob;
    flight: IFlight;
    error?: string;
}

interface IUpgradableFlight {
    fareClass: string;
    quantity: number;
}

export class App {
    private readonly _chromeInstance: ChromeInstance;
    private readonly _flightManager: FlightManager;
    private readonly _smsProvider: SmsProvider;
    private readonly _config: IAppConfig;
    private readonly _logger: BaseLogger;
    private readonly _upgradableClasses = [/PZ([1-9])/, /PN([1-9])/, /RN([1-9])/];
    private jobs: IJob[] = [];

    constructor(jobs: IJob[], config?: IAppConfig) {
        // Set config defaults, then override with any provided values
        this._config = buildConfigWithDefaults(config, {
            debug: process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
        });

        // Create Chrome instance
        this._chromeInstance = new ChromeInstance({
            userDataDir: process.env.CHROME_USER_DATA_FOLDER,
            debug: this._config.debug
        });

        // Create flight manager instance
        this._flightManager = new FlightManager({
            chrome: this._chromeInstance
        });

        // Configure SMS notifier
        this._smsProvider = new SmsProvider({
            ...this._config.twilio
        });

        // Assign jobs
        this.jobs = [...jobs];

        // Configure logger
        this._logger = new WinstonLogger('Main').logger;
    }

    public getSpecificFlight(flightNumber: string, flights: IFlight[]): IFlight {
        const targetFlight = flights.find((flight) => flight.FlightNumber === flightNumber);

        return targetFlight;
    }

    public async checkUpgradability(targetFlight: IFlight) {
        const upgradableFlights: IUpgradableFlight[] = [];

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

    public async executeJobs(jobs: IJob[]): Promise<IJobResult[]> {
        const jobResults: IJobResult[] = [];

        // Iterate all jobs and retrieve flights
        for (let [jobIndex, job] of jobs.entries()) {
            let targetFlight: IFlight;
            let jobError: string = null;
            jobIndex = jobIndex + 1;

            // Skip job if completed
            if (job.completed === true) {
                this._logger.debug(`[Job #${jobIndex}] Already completed, skipping...`);
                continue;
            }

            // Skip and mark job as completed if departure date has passed
            if (addDaysToDate(job.itinerary.departureDate, 1) < new Date()) {
                this._logger.info(`[Job #${jobIndex}] Date passed, marking as completed...`);
                job.completed = true;
                continue;
            }

            this._logger.info(`[Job #${jobIndex}] Executing...`);

            try {
                // Get flights
                const flights = await this._flightManager.getFlights(
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
                    `[Job #${jobIndex}] Unable to locate target flight: ${job.itinerary.flightNumber}`
                );
                jobError = 'Unable to locate desired flight';
            } else {
                this._logger.debug(
                    `[Job #${jobIndex}] Located target flight: UA ${targetFlight.FlightNumber}`
                );
            }

            // Add job reference/pointer, flight object, and possible errors to results
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
        }

        // Ensure job results have been loaded
        if (jobResults.length === 0) {
            this._logger.warn('No job results found');
        } else {
            // Close Chrome
            this._logger.debug('Closing chrome...');
            await this._chromeInstance.dispose();
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
                await this._smsProvider.send(
                    `Found upgrade availability for flight UA ${flight.FlightNumber} on ${jobMeta.itinerary.departureDate}.\nFare class: ${fareClass}\nQuantity: ${quantity}`
                );

                // Mark original job as completed using `jobMeta` reference
                jobMeta.completed = true;
            }
        }

        // Exit process if all jobs have completed
        const allCompleted = this.jobs.every((job) => job.completed === true);
        if (allCompleted) {
            this._logger.info('All jobs have completed, goodbye!');
            process.exit(0);
        }

        // List completed jobs for human reference
        for (const job of this.jobs) {
            if (job.completed !== true) continue;

            const { origin, destination, departureDate, flightNumber } = job.itinerary;

            this._logger.info(
                `Completed job: [UA ${flightNumber}] ${origin} -> ${destination} on ${departureDate}`
            );
        }
    }
}
