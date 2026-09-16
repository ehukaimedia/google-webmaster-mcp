import { google, businessprofileperformance_v1, mybusinessaccountmanagement_v1, mybusinessbusinessinformation_v1 } from 'googleapis';
import { getAuthClient } from '../auth/auth.js';
import { withGbpErrors } from './errors.js';
import { parseAccountName, parseLocationRef } from './names.js';

export const DEFAULT_LOCATION_READ_MASK = [
    'name',
    'title',
    'storeCode',
    'languageCode',
    'phoneNumbers',
    'storefrontAddress',
    'websiteUri',
    'regularHours',
    'profile',
    'metadata',
    'openInfo',
].join(',');

const DEFAULT_PERFORMANCE_METRICS = [
    'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
    'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
    'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
    'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
    'CALL_CLICKS',
    'WEBSITE_CLICKS',
    'BUSINESS_DIRECTION_REQUESTS',
];

function parseIsoDate(value: string): { year: number; month: number; day: number } {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
        throw new Error('Dates must use YYYY-MM-DD');
    }
    return {
        year: Number(match[1]),
        month: Number(match[2]),
        day: Number(match[3]),
    };
}

function parseYearMonth(value: string): { year: number; month: number } {
    const match = /^(\d{4})-(\d{2})$/.exec(value);
    if (!match) {
        throw new Error('Months must use YYYY-MM');
    }
    return {
        year: Number(match[1]),
        month: Number(match[2]),
    };
}

export class GbpClient {
    constructor(
        private readonly accountManagement: mybusinessaccountmanagement_v1.Mybusinessaccountmanagement,
        private readonly businessInformation: mybusinessbusinessinformation_v1.Mybusinessbusinessinformation,
        private readonly performance: businessprofileperformance_v1.Businessprofileperformance,
    ) {}

    static async create() {
        const auth = await getAuthClient();
        return new GbpClient(
            google.mybusinessaccountmanagement({ version: 'v1', auth }),
            google.mybusinessbusinessinformation({ version: 'v1', auth }),
            google.businessprofileperformance({ version: 'v1', auth }),
        );
    }

    async listAccounts(pageToken?: string) {
        return withGbpErrors(async () => {
            const res = await this.accountManagement.accounts.list({
                pageSize: 100,
                pageToken,
            });
            return {
                accounts: res.data.accounts || [],
                nextPageToken: res.data.nextPageToken,
            };
        });
    }

    async listLocations(accountId: string, readMask = DEFAULT_LOCATION_READ_MASK, pageToken?: string) {
        return withGbpErrors(async () => {
            const res = await this.businessInformation.accounts.locations.list({
                parent: parseAccountName(accountId),
                readMask,
                pageSize: 100,
                pageToken,
            });
            return {
                locations: res.data.locations || [],
                nextPageToken: res.data.nextPageToken,
            };
        });
    }

    async getLocation(locationId: string, readMask = DEFAULT_LOCATION_READ_MASK) {
        return withGbpErrors(async () => {
            const res = await this.businessInformation.locations.get({
                name: parseLocationRef(locationId).locationName,
                readMask,
            });
            return res.data;
        });
    }

    async updateLocation(
        locationId: string,
        location: Record<string, unknown>,
        updateMask: string,
        validateOnly = true,
    ) {
        return withGbpErrors(async () => {
            const res = await this.businessInformation.locations.patch({
                name: parseLocationRef(locationId).locationName,
                updateMask,
                validateOnly,
                requestBody: location as mybusinessbusinessinformation_v1.Schema$Location,
            });
            return res.data;
        });
    }

    async getPerformance(locationId: string, startDate: string, endDate: string, dailyMetrics?: string[]) {
        return withGbpErrors(async () => {
            const start = parseIsoDate(startDate);
            const end = parseIsoDate(endDate);
            const res = await this.performance.locations.fetchMultiDailyMetricsTimeSeries({
                location: parseLocationRef(locationId).locationName,
                dailyMetrics: dailyMetrics && dailyMetrics.length > 0 ? dailyMetrics : DEFAULT_PERFORMANCE_METRICS,
                'dailyRange.startDate.year': start.year,
                'dailyRange.startDate.month': start.month,
                'dailyRange.startDate.day': start.day,
                'dailyRange.endDate.year': end.year,
                'dailyRange.endDate.month': end.month,
                'dailyRange.endDate.day': end.day,
            });
            return res.data;
        });
    }

    async listSearchKeywords(
        locationId: string,
        startMonth: string,
        endMonth: string,
        pageToken?: string,
    ) {
        return withGbpErrors(async () => {
            const start = parseYearMonth(startMonth);
            const end = parseYearMonth(endMonth);
            const res = await this.performance.locations.searchkeywords.impressions.monthly.list({
                parent: parseLocationRef(locationId).locationName,
                'monthlyRange.startMonth.year': start.year,
                'monthlyRange.startMonth.month': start.month,
                'monthlyRange.endMonth.year': end.year,
                'monthlyRange.endMonth.month': end.month,
                pageSize: 100,
                pageToken,
            });
            return {
                searchKeywordsCounts: res.data.searchKeywordsCounts || [],
                nextPageToken: res.data.nextPageToken,
            };
        });
    }
}
