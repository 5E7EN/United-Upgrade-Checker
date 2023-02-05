import { App } from './app';

const savedFlightsFile = 'temp/flights-1675593485516.json';

const app = new App({
    twilio: {
        authID: process.env.TWILIO_AUTH_ID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        fromNumber: process.env.TWILIO_FROM_NUMBER,
        toNumber: process.env.TWILIO_TO_NUMBER,
        ownerNumber: process.env.TWILIO_OWNER_NUMBER
    }
    //savedFlightsFile
});

// TODO: Refactor
async function check() {
    const result = await app.start();

    if (result.found) {
        console.log('Upgrade found. Exiting...');
        process.exit(0);
    }
}

setInterval(check, 600 * 1000);
check();
