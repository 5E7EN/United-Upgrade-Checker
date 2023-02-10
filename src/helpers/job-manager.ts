import fs from 'fs';

import { WinstonLogger, addDaysToDate } from '../utils';
import type { FlightManager } from './flight-manager';
import type { BaseLogger } from '../utils';
import type { IFlight, IJob, IJobResult } from '../types';

interface IJobManagerConfig {
    flightManager: FlightManager;
}

export class JobManager {
    private readonly _config: IJobManagerConfig;
    private readonly _logger: BaseLogger;

    constructor(config: IJobManagerConfig) {
        // Set config
        this._config = config;

        // Configure logger
        this._logger = new WinstonLogger('Job Manager').logger;
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
                const flights = await this._config.flightManager.getFlights(
                    job.itinerary.origin,
                    job.itinerary.destination,
                    job.itinerary.departureDate
                );
                this._logger.debug(`[Job #${jobIndex}] Total flights found: ${flights.length}`);

                // Single out target flight via flight number
                targetFlight = this._config.flightManager.getSpecificFlight(
                    job.itinerary.flightNumber,
                    flights
                );
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
        fs.writeFileSync(
            `${process.cwd()}/temp/jobs-${currentDateMs}.json`,
            JSON.stringify(jobResults)
        );
        this._logger.debug(`Flights saved in temp/jobs-${currentDateMs}.json`);

        return jobResults;
    }
}