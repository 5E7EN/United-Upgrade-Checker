import dotenv from 'dotenv';
import chalk from 'chalk';
import fs from 'fs';

import { FlightManager, JobManager, ChromeInstance } from './helpers';
import { SmsProvider } from './providers';

import { WinstonLogger, buildConfigWithDefaults } from './utils';
import type { BaseLogger } from './utils';
import type { IFlight, IJob, IJobResult } from './types';

// Configure environmental variables
dotenv.config();

interface IAppConfig {
    /**
     * Optional configuration for SMS provider (Twilio).
     * Default uses environmental variables as defined in .env file.
     */
    twilio?: {
        authID: string;
        authToken: string;
        fromNumber: string;
        ownerNumber: string;
    };
    /**
     * Debug level to be applied to all application modules.
     * @default process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
     */
    debug?: boolean;
    /**
     * Path to file containing previously executed jobs in JSON format.
     * If specified, the jobs will be replayed and re-evaluated to find upgrades.
     */
    savedJobsFile?: string;
    /**
     * Disables SMS notifications if set to `true`.
     */
    disableSms?: boolean;
}

interface IUpgradableFlight {
    fareClass: string;
    quantity: number;
}

export class App {
    private readonly _config: IAppConfig;
    private readonly _chromeInstance: ChromeInstance;
    private readonly _flightManager: FlightManager;
    private readonly _jobManager: JobManager;
    private readonly _smsProvider: SmsProvider;
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

        // Create flight manager instance
        this._jobManager = new JobManager({
            flightManager: this._flightManager,
            chrome: this._chromeInstance
        });

        if (!this._config.disableSms) {
            // Configure SMS notifier
            this._smsProvider = new SmsProvider({
                ...this._config.twilio
            });
        }

        // Assign jobs
        this.jobs = [...jobs];

        // Configure logger
        this._logger = new WinstonLogger('Main').logger;
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
            const results = await this._jobManager.executeJobs(this.jobs);
            jobResults.push(...results);
        }

        // Ensure job results have been loaded
        if (jobResults.length === 0) {
            this._logger.warn('No job results found');
        }

        // Iterate each job and check for upgrade availability
        for (const jobResult of jobResults) {
            const { job: jobMeta, flight, error } = jobResult;
            const jobResultIndex = jobResults.indexOf(jobResult) + 1;

            if (error) {
                // Mark job as completed if departure date has passed (accounting for timezone differences)
                if (error.startsWith('ValidateInput: DepartDate is invalid for selected Origin')) {
                    this._logger.info(
                        `[Job #${jobResultIndex}] Departure date passed in origin ${jobMeta.itinerary.origin}, marking as completed...`
                    );
                    jobMeta.completed = true;
                    continue;
                }

                this._logger.error(
                    `[Job #${jobResultIndex}] Encountered error while retrieving flights: ${error}`
                );
                this._logger.error(`[Job #${jobResultIndex}] Skipping...`);
                continue;
            }

            // Check for upgradability
            const upgradability = await this.checkUpgradability(flight);

            // Ensure upgradability result includes target fare class
            if (
                upgradability.length === 0 ||
                !upgradability.some(({ fareClass }) => fareClass === jobMeta.itinerary.targetClass)
            ) {
                this._logger.info(
                    `[Job #${jobResultIndex}] No upgradability found for desired fare class`
                );
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
                console.log(chalk.yellow('Flight: ' + chalk.magenta('UA ' + flight.FlightNumber)));
                console.log(
                    chalk.yellow('Date: ' + chalk.magenta(jobMeta.itinerary.departureDate))
                );

                console.log(chalk.yellow('Fare class: ' + chalk.cyan(fareClass)));
                console.log(
                    chalk.yellow(
                        'Quantity: ' +
                            (Number(quantity) < 3 ? chalk.red(quantity) : chalk.cyan(quantity))
                    )
                );
                console.log('---');

                if (!this._config.disableSms) {
                    // Send SMS notification
                    await this._smsProvider.send(
                        jobMeta.phone,
                        `Found upgrade availability for flight UA ${flight.FlightNumber} on ${jobMeta.itinerary.departureDate}.\nFare class: ${fareClass}\nQuantity: ${quantity}`
                    );
                }

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
