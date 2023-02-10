# TODO

-   Handle errors:
    -   Once flight passed:
    ```
    - Encountered errors: ValidateInput: DepartDate is invalid for selected Origin., ServiceErrorProcessing
    (node:5660) UnhandledPromiseRejectionWarning: TypeError: Cannot read property '0' of null
    ```
    Analyze response: `flights-1675832699088.json` (no flights?)
    -   Flight not found:
    ```
    - Encountered errors: Flights may be available at nearby airports.<!--ErrCode:FA131-->, , FLIGHTS NOT FOUND, ServiceErrorProcessing
    - Flight batch acquired
    - Encountered errors: Flights may be available at nearby airports.<!--ErrCode:FA131-->, , FLIGHTS NOT FOUND, ServiceErrorProcessing
    - Flight batch acquired
    ```
    Analyze response: `flights-1675829103910.json` (no flights?)
    -   Unable to find flight: flight still can exist even though not in current results.  
        Analyze response: `flights-1675884783491.json`
