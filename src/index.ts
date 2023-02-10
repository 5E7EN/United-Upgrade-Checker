import { App } from './app';
import type { IJob } from './types';

const jobs: IJob[] = [
    {
        phone: process.env.TWILIO_TO_NUMBER,
        itinerary: {
            origin: 'EWR',
            destination: 'TLV',
            departureDate: '02/11/2023',
            flightNumber: '999',
            targetClass: 'PZ'
        },
        completed: false
    }
];

const app = new App(jobs, {
    twilio: {
        authID: process.env.TWILIO_AUTH_ID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        fromNumber: process.env.TWILIO_FROM_NUMBER,
        ownerNumber: process.env.TWILIO_OWNER_NUMBER
    },
    savedJobsFile: null
});

async function check() {
    await app.start();
}

check();
setInterval(check, 600 * 1000);
