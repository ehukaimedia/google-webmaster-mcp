import { google, analyticsdata_v1beta, analyticsadmin_v1beta } from 'googleapis';
import { getAuthClient } from '../auth/auth.js';

export class AnalyticsClient {
    private dataClient: analyticsdata_v1beta.Analyticsdata;
    private adminClient: analyticsadmin_v1beta.Analyticsadmin;

    constructor(authClient: any) {
        this.dataClient = google.analyticsdata({ version: 'v1beta', auth: authClient });
        this.adminClient = google.analyticsadmin({ version: 'v1beta', auth: authClient });
    }

    static async create() {
        const authClient = await getAuthClient();
        return new AnalyticsClient(authClient);
    }

    async listAccountSummaries() {
        const res = await this.adminClient.accountSummaries.list();
        return res.data.accountSummaries || [];
    }

    async runReport(
        propertyId: string,
        dateRanges: { startDate: string; endDate: string }[],
        dimensions?: { name: string }[],
        metrics?: { name: string }[],
        limit?: number
    ) {
        const res = await this.dataClient.properties.runReport({
            property: `properties/${propertyId}`,
            requestBody: {
                dateRanges,
                dimensions,
                metrics,
                limit: limit ? String(limit) : undefined,
            },
        });
        return res.data;
    }
}
