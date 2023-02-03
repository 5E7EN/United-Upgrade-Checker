export interface IFlightResponse {
    status: string;
    data: Data;
    errors: [] | null;
}

export interface Data {
    IsRevised: boolean;
    Calendar: null;
    FareWheel: FareWheel;
    BetterOffers: null;
    FareMatrix: null;
    ShowFareWheel: boolean;
    CartId: string;
    Errors: any[];
    IsAward: boolean;
    IsExpertMode: boolean;
    PageIndex: number;
    PriceSummary: null;
    Trips: Trip[];
    SelectedTrips: any[];
    SearchType: string;
    SearchFilters: SearchFilters;
    Status: number;
    TcMessage: TcMessage;
    Disclaimer: null;
    SelectableUpgradesOriginal: null;
    SelectableUpgrades: null;
    MilesBalance: null;
    RPUBalance: number;
    GPUBalance: number;
    NoOfTravelers: number;
    Messages: any[];
    BillingAddressCountryDescription: string;
    IsPassPlusSecure: boolean;
    IsPassPlusFlex: boolean;
    LastSolutionSetId: string;
    LastResultId: string;
    PricingBySlice: boolean;
    IsLmxIncluded: boolean;
    IsLmxActive: boolean;
    NonStopOnly: boolean;
    HideNonStopOnly: boolean;
    IsAwardCalendarSeasonal: boolean;
    IsAwardNonStopDisabled: boolean;
    IsCorpRatesApplied: boolean;
    OriginalReservation: null;
    UseClearAllFilters: boolean;
    GuiFiltersApplied: boolean;
    IsValidPromotion: boolean;
}

export interface FareWheel {
    GridRowItems: null;
    AmountLength: number;
    CabinSelection: string;
    CabinSelectionText: string;
    NearestNonStopDate: null;
}

export interface SearchFilters {
    CurrencyCode: Currency;
    AircraftTypes: null;
    AirportsDestination: string;
    AirportsDestinationList: AirportsDestinationList[];
    AirportsOrigin: string;
    AirportsOriginList: AirportsDestinationList[];
    OneStopAirports: any[];
    TwoPlusStopAirports: any[];
    AirportsStop: null;
    AirportsStopList: any[];
    AirportsStopToAvoid: null;
    AirportsStopToAvoidList: any[];
    BookingCodes: null;
    CabinOptions: AirportsDestinationList[];
    CabinCountMax: number;
    CabinCountMin: number;
    CarriersMarketing: string;
    CarriersMarketingList: AirportsDestinationList[];
    CarriersOperating: string;
    CarriersOperatingList: AirportsDestinationList[];
    CarrierDefault: boolean;
    CarrierExpress: boolean;
    CarrierPartners: boolean;
    CarrierStar: boolean;
    LayoverMax: number;
    LayoverMin: number;
    HideLayover: boolean;
    HideNoneStop: boolean;
    HideOneStop: boolean;
    HideTwoPlusStop: boolean;
    HideArrivalTime: boolean;
    HideDepartureTime: boolean;
    HideDuration: boolean;
    HideAirportSection: boolean;
    HideExperienceSection: boolean;
    IsUnaccompaniedMinor: boolean;
    HideColumnPrices: HideColumnPrices;
    HideColumnPricesAward: HideColumnPrices;
    DurationMax: number;
    DurationMin: number;
    DurationStopMax: number;
    DurationStopMin: number;
    EquipmentCodes: string;
    EquipmentList: AirportsDestinationList[];
    EquipmentTypes: string;
    FareFamily: string;
    PriceMax: number;
    PriceMin: number;
    MinPrices: MaxPrices;
    MaxPrices: MaxPrices;
    NonStopMinPricesByColumn: NonStopMinPricesByColumn;
    OneStopMinPricesByColumn: OneStopMinPricesByColumn;
    TwoPlusMinPricesByColumn: OneStopMinPricesByColumn;
    MinPricesAward: Award;
    MaxPricesAward: Award;
    NonStopMinPricesByColumnAward: Award;
    OneStopMinPricesByColumnAward: OneStopMinPricesByColumn;
    TwoPlusMinPricesByColumnAward: OneStopMinPricesByColumn;
    OriginsMinPricesByColumn: NSMinPricesByColumn;
    DestinationsMinPricesByColumn: NSMinPricesByColumn;
    PriceMinFormatted: NonStopFormattedAmount;
    StopCountExcl: number;
    StopCountMax: number;
    StopCountMin: number;
    TimeArrivalMax: string;
    TimeArrivalMin: string;
    TimeDepartMax: string;
    TimeDepartMin: string;
    TimeDepartMinPreferred: null;
    TimeDepartMaxPreferred: null;
    TimeArrivalMinPreferred: null;
    TimeArrivalMaxPreferred: null;
    CarrierPreferred: null;
    Warnings: any[];
    DreamLinerExist: boolean;
    SingleCabinExist: boolean;
    MultiCabinExist: boolean;
    TurboPropExist: boolean;
    NonStopFormattedAmount: NonStopFormattedAmount;
    OneStopFormattedAmount: string;
    TwoPlusStopFormattedAmount: string;
    NonStopFormattedAmountAward: NonStopFormattedAmount;
    StopFormattedAmountAward: string;
    Amenities: any[];
}

export interface AirportsDestinationList {
    Code: string;
    Description: null | string;
    TimeFormatted: null | string;
    CurrencyCode: null;
    Amount: number;
    AmountFormatted: NonStopFormattedAmount | null;
    Active: boolean;
    HasSingleConnection: boolean;
}

export enum NonStopFormattedAmount {
    Empty = '',
    The1068 = '$1,068',
    The240 = '$240',
    The280 = '$280',
    The310 = '$310',
    The679 = '$679'
}

export enum Currency {
    Usd = 'USD'
}

export interface NSMinPricesByColumn {
    'ECO-BASIC': AirportsDestinationList[];
    ECONOMY: AirportsDestinationList[];
    'ECONOMY-UNRESTRICTED': AirportsDestinationList[];
    'MIN-BUSINESS-OR-FIRST': AirportsDestinationList[];
}

export interface HideColumnPrices {
    'ECO-BASIC': boolean;
    ECONOMY: boolean;
    'ECONOMY-UNRESTRICTED': boolean;
    'MIN-BUSINESS-OR-FIRST': boolean;
}

export interface MaxPrices {
    'ECO-BASIC': number;
    ECONOMY: number;
    'ECONOMY-UNRESTRICTED': number;
    'MIN-BUSINESS-OR-FIRST': number;
}

export interface Award {
    'ECO-BASIC': EcoBasic;
    ECONOMY: EcoBasic;
    'ECONOMY-UNRESTRICTED': EcoBasic;
    'MIN-BUSINESS-OR-FIRST': EcoBasic;
}

export interface EcoBasic {
    Price: number;
    TaxAndFees: number;
    FormattedAmount: NonStopFormattedAmount;
    IsBusiness: boolean;
}

export interface NonStopMinPricesByColumn {
    'ECO-BASIC': string;
    ECONOMY: string;
    'ECONOMY-UNRESTRICTED': string;
    'MIN-BUSINESS-OR-FIRST': string;
}

export interface OneStopMinPricesByColumn {}

export interface TcMessage {
    FromServer: boolean;
    Headline: string;
    Message: string;
    MessageBold: null;
    MessageRemainder: null;
    Type: null;
    Url: null;
    LinkText: string;
    WrapInLegacyLanguage: boolean;
    Code: null;
}

export interface Trip {
    Index: number;
    CellIdSelected: null;
    BBXSession: null;
    SolutionSetId: string;
    DepartDate: Date;
    ReturnDate: null;
    DepartDateFormat: string;
    DepartTime: null;
    Destination: string;
    DestinationDecoded: string;
    Flights: IFlight[];
    Columns: Column[];
    Origin: string;
    OriginDecoded: string;
    TotalFlightCount: number;
    CurrentFlightCount: number;
    PageIndex: number;
    OriginalMileage: number;
    OriginalMileageTotal: number;
    Used: boolean;
    ChangeType: number;
    DepartDateShort: string;
    OriginTriggeredAirport: boolean;
    DestinationTriggeredAirport: boolean;
    LowestEconomyFare: number;
    FutureTravelDate: null;
    IsPartialFlightCovered: boolean;
}

export interface Column {
    Description: string;
    ProductSubtype: ProductSubtypeEnum;
    ProductType: string;
    CssClass: string;
    ColumnName: string;
    SubColumns: null;
    FareContentDescription: string;
    MarketingText: string;
    DataSourceLabelStyle: DataSourceLabelStyle;
    UpgradeFrom: null;
    UpgradeTo: null;
    Currency: null;
    BagFee: number;
    FareFamilies: string[];
    FareFamily: string;
}

export enum DataSourceLabelStyle {
    Economy = 'ECONOMY',
    First = 'FIRST'
}

export enum ProductSubtypeEnum {
    Revenue = 'Revenue'
}

export interface IFlight {
    Index: number;
    FlightIndex: number;
    BestMatchIndex: number;
    AddCollectWaived: null;
    AddCollectWaivedFlightData: null;
    SolutionSetId: string;
    BookingClassAvailList: string[];
    ChangeOfGauge: null;
    ChangeOfPlane: boolean;
    Connections: null;
    ConnectTimeMinutes: number;
    DepartDateTime: string;
    DepartDateFormat: string;
    DepartTimeFormat: string;
    Destination: string;
    DestinationCountryCode: null;
    DestinationDateTime: string;
    DestinationDateFormat: string;
    DestinationTimeFormat: string;
    DestinationDescription: string;
    LastDestination: AirportsDestinationList;
    LastDestinationDateTime: string;
    LastDestinationDateFormat: null;
    EquipmentDisclosures: EquipmentDisclosures;
    AllEquipmentDisclosures: EquipmentDisclosures[];
    FlightNumber: string;
    Hash: string;
    IsCheapestAirfare: boolean;
    IsStop: boolean;
    MarketingCarrier: string;
    MarketingCarrierDescription: string;
    Miles: null;
    OnTimePerf: null;
    OperatingCarrier: string;
    OperatingCarrierDescription: null;
    OperatingCarrierMessage: string;
    OperatingCarrierShort: null;
    Origin: string;
    OriginCountryCode: null;
    OriginDescription: string;
    IsUpgradeEligible: boolean;
    IsOAX: boolean;
    OAXTooltipMessage: string;
    OAXAirportCode: string;
    ChangeOfAirportExists: boolean;
    DateChangeExists: boolean;
    Products: Product[];
    MinPrice: number;
    MaxPrice: number;
    PricesByColumn: MaxPrices;
    PricesByColumnAward: Award;
    Selected: boolean;
    StopDestination: null;
    SubjectToGovernmentApproval: boolean;
    StopInfos: any[];
    UniqueStopInfoCarrierShort: any[];
    StopsandConnections: number;
    AirportsStopList: any[];
    TravelMinutes: number;
    TravelMinutesTotal: number;
    FlightSegmentJson: string;
    Warnings: null;
    FlightArrivalDay: null;
    FlightArrivalDayLast: null;
    IsUnitedExpress: boolean;
    IsUnited: boolean;
    IsStarAlliance: boolean;
    UniqueCarriers: any[];
    UniqueCarriersWithMainline: string[];
    IsUnitedPartner: boolean;
    MaxLayoverTime: number;
    MinLayoverTime: number;
    IsSearchedAirportMismatch: boolean;
    DepartDateModifierFormat: null;
    ArrivalDateModifierFormat: null;
    IsOperatedByTextBold: boolean;
    IsNotMixedIternary: boolean;
    ChaseBenefitMessage: null;
    IsAwardFlight: boolean;
    IsAwardSameDayFlight: boolean;
    ShowVBQChanges: boolean;
    IsCovidTestingRequired: boolean;
}

export interface EquipmentDisclosures {
    EquipmentDescription: string;
    EquipmentType: string;
    IsSingleCabin: boolean;
    NoBoardingAssistance: boolean;
    NonJetEquipment: boolean;
    WheelchairsNotAllowed: boolean;
}

export interface Product {
    Index: number;
    BookingCode: string;
    BookingCount: number;
    BestMatchSortOrder: number;
    ColumnDesc: string;
    Description: Description;
    DescriptionWaitlist: null;
    DataSourceLabelStyle: DataSourceLabelStyle;
    Prices: TaxAndFees[];
    TaxAndFees: TaxAndFees;
    MealDescription: string;
    NegativePriceDetected: boolean;
    Mileage: number;
    MileageFormat: MileageFormat;
    ProductId: string;
    ProductPath: ProductSubtypeEnum;
    ProductSubtype: ProductSubtype;
    AwardType: null;
    ShowSaverAwardMessage: boolean;
    ProductType: string;
    SolutionId: string;
    Upgrade: boolean;
    WarningMessage: string;
    PromoDescription: null;
    FlightDetails: null;
    ProductTypeDescription: string;
    UpgradeInfo: null;
    IsMixedCabin: boolean;
    IsMixedUpgrade: boolean;
    IsUpgradeIndicator: boolean;
    InstrumentFlightBlockUpgrade: null;
    AdditionalUpgrades: null;
    LmxLoyaltyTiers: null;
    IsMixedCurrency: boolean;
    hasAddCollectFee: boolean;
    hasChangeFee: boolean;
    hasChangeAndAddCollectFee: boolean;
    IsElf: boolean;
    ProductCode: null;
    CabinType: CabinType;
    isLowestFare: boolean;
    CabinTypeCode: CabinTypeCode;
    FareFamily: string;
    UpgradeOptions: any[];
    CustomizePriceViewModelList: null;
    IBEType: string;
    Context: Context;
}

export enum CabinType {
    Coach = 'Coach',
    First = 'First'
}

export enum CabinTypeCode {
    Ue = 'UE',
    Uf = 'UF'
}

export interface Context {
    StrikeThroughPricing: null;
}

export enum Description {
    UnitedEconomy = 'United Economy',
    UnitedFirst = 'United First'
}

export enum MileageFormat {
    The2127 = '2,127'
}

export interface TaxAndFees {
    Amount: number;
    AmountFormat: null | string;
    Currency: Currency | null;
    PricingType: PricingType;
    PricingDetails: null;
}

export enum PricingType {
    Copay = 'Copay',
    Credit = 'Credit',
    Others = 'Others',
    SubTotal = 'SubTotal',
    Total = 'Total'
}

export enum ProductSubtype {
    Base = 'BASE'
}
