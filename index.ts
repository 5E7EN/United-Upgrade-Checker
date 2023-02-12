import { App } from './src/app';
import type { IJob } from './src/types';

// Every x number of minutes to check for upgradability
const checkInterval = 10;

// Define jobs and add `completed` key to each
const jobs: IJob[] = [
    {
        // Exclude this key if not using SMS notifications
        phone: process.env.TWILIO_TO_NUMBER,
        itinerary: {
            origin: 'EWR',
            destination: 'TLV',
            departureDate: '02/11/2023',
            flightNumber: '999',
            // Available fare classes: PZ, PN, RN
            targetClass: 'PZ'
        }
    }
].map((job) => ({ ...job, completed: false }));

// Create application instance
const app = new App(jobs, {
    // Set to `false` to enable SMS notifications
    disableSms: true
});

// Run app every x minutes, as defined by `checkInterval` above
async function check() {
    await app.start();
}

check();
setInterval(check, checkInterval * 60 * 1000);
