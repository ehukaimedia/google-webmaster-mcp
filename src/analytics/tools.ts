import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { AnalyticsClient } from './client.js';

let analyticsClient: AnalyticsClient | null = null;

async function getClient() {
    if (!analyticsClient) {
        analyticsClient = await AnalyticsClient.create();
    }
    return analyticsClient;
}

export const ANALYTICS_TOOLS: Tool[] = [
    {
        name: 'analytics_list_account_summaries',
        description: 'List account summaries (accounts and properties) accessible to the user.',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'analytics_run_report',
        description: 'Run a report on a GA4 property.',
        inputSchema: {
            type: 'object',
            properties: {
                propertyId: { type: 'string', description: 'GA4 Property ID (e.g., 123456789)' },
                startDate: { type: 'string', description: 'Start date (YYYY-MM-DD or "yesterday", "today", "30daysAgo")' },
                endDate: { type: 'string', description: 'End date (YYYY-MM-DD or "yesterday", "today")' },
                dimensions: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'List of dimension names (e.g., ["eventName", "city"])',
                },
                metrics: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'List of metric names (e.g., ["eventCount", "activeUsers"])',
                },
                limit: { type: 'number', description: 'Maximum number of rows to return' },
            },
            required: ['propertyId', 'startDate', 'endDate'],
        },
    },
    {
        name: 'analytics_get_metadata',
        description: 'Get available dimensions and metrics for a GA4 property.',
        inputSchema: {
            type: 'object',
            properties: {
                propertyId: { type: 'string', description: 'GA4 Property ID' },
            },
            required: ['propertyId'],
        },
    },
];

export async function handleAnalyticsTool(name: string, args: any) {
    const client = await getClient();

    switch (name) {
        case 'analytics_list_account_summaries': {
            const summaries = await client.listAccountSummaries();
            return {
                content: [{ type: 'text', text: JSON.stringify(summaries, null, 2) }],
            };
        }

        case 'analytics_get_metadata': {
            const metadata = await client.getMetadata(args.propertyId);
            return {
                content: [{ type: 'text', text: JSON.stringify(metadata, null, 2) }],
            };
        }

        case 'analytics_run_report': {
            const { propertyId, startDate, endDate, dimensions, metrics, limit } = args;
            const dateRanges = [{ startDate, endDate }];
            const dimObjs = dimensions?.map((d: string) => ({ name: d }));
            const metObjs = metrics?.map((m: string) => ({ name: m }));

            const report = await client.runReport(propertyId, dateRanges, dimObjs, metObjs, limit);
            return {
                content: [{ type: 'text', text: JSON.stringify(report, null, 2) }],
            };
        }

        default:
            throw new Error(`Unknown Analytics tool: ${name}`);
    }
}
