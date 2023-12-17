# United Upgrade Checker

__UPDATE: As noted in [DansDeals's recent article](https://www.dansdeals.com/points-travel/milespoints/travel-tips-workarounds-bring-back-good-old-award-airfare-search-interface/), the legacy award calender for United flights has been killed, which was a key component of this application.  
Therefore, this program no longer works - though perhaps it can be tweaked to work with the new interface...__

---

Automatically checks for United flight instant upgrade availability on set interval.

## Usage:

See `index.ts` for example usage.

-   `yarn install`
-   `yarn start`

## Features:

-   Supports multiple itineraries (just add multiple jobs to `jobs` array)
-   Supports SMS notifications

### SMS Notifications:

To enable SMS notifications you must create a Twilio (trial) account.  
Once ready, proceed below:

-   Set `disableSms: true` in index.ts
-   Copy `.env.example` into `.env` and populate all Twilio-related values
-   All instances of phone numbers found in `.env` should include the country code (e.g. `+18008008000`)

## Disclaimer

-   This tool is provided for educational purposes only. Use at your own risk.
-   It is recommended to use a VPN while running this tool!

---

This tool is designed for advanced users only.
Please don't create GitHub issues that aren't related to actual bugs/features in the codebase.
