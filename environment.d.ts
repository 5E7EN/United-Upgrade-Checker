declare namespace NodeJS {
    export interface ProcessEnv {
        TWILIO_AUTH_ID: string;
        TWILIO_AUTH_TOKEN: string;
        TWILIO_FROM_NUMBER: string;
        TWILIO_TO_NUMBER: string;
        TWILIO_OWNER_NUMBER: string;

        NODE_ENV: string;
        LOG_LEVEL?: string;
    }
}
