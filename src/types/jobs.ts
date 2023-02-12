import type { IFlight } from './flights';

interface IItinerary {
    origin: string;
    destination: string;
    departureDate: string;
    flightNumber: string;
    targetClass: string;
}

export interface IJob {
    phone?: string;
    itinerary: IItinerary;
    completed: boolean;
    completedAt?: Date;
}

export interface IJobResult {
    job: IJob;
    flight: IFlight;
    error?: string;
}
