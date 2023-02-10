export function addDaysToDate(rawDate: string, days: number) {
    const date = new Date(rawDate);
    date.setDate(date.getDate() + days);
    return date;
}
