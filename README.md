# United Upgrade Checker

Automatically checks for United flight upgrade availability.

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
