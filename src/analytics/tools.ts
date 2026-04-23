import { AnalyticsClient } from './client.js';
import { createToolRegistry, defineTool, jsonResult } from '../mcp/tool-registry.js';

let analyticsClient: AnalyticsClient | null = null;

async function getClient() {
    if (!analyticsClient) {
        analyticsClient = await AnalyticsClient.create();
    }
    return analyticsClient;
}

interface AnalyticsReportArgs {
    propertyId: string;
    startDate: string;
    endDate: string;
    dimensions?: string[];
    metrics?: string[];
    limit?: number;
}

interface AnalyticsMetadataArgs {
    propertyId: string;
}

export const ANALYTICS_REGISTRY = createToolRegistry([
    defineTool({
        name: 'analytics_list_account_summaries',
        description: 'List account summaries (accounts and properties) accessible to the user.',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    }, async () => {
        const client = await getClient();
        return jsonResult(await client.listAccountSummaries());
    }),
    defineTool<AnalyticsReportArgs>({
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
                    minItems: 1,
                },
                limit: { type: 'number', description: 'Maximum number of rows to return' },
            },
            required: ['propertyId', 'startDate', 'endDate', 'metrics'],
        },
    }, async ({ propertyId, startDate, endDate, dimensions, metrics, limit }) => {
        const client = await getClient();
        const dateRanges = [{ startDate, endDate }];
        const dimObjs = dimensions?.map((dimension) => ({ name: dimension }));
        const metricObjs = metrics?.map((metric) => ({ name: metric }));

        return jsonResult(await client.runReport(propertyId, dateRanges, dimObjs, metricObjs, limit));
    }),
    defineTool<AnalyticsMetadataArgs>({
        name: 'analytics_get_metadata',
        description: 'Get available dimensions and metrics for a GA4 property.',
        inputSchema: {
            type: 'object',
            properties: {
                propertyId: { type: 'string', description: 'GA4 Property ID' },
            },
            required: ['propertyId'],
        },
    }, async ({ propertyId }) => {
        const client = await getClient();
        return jsonResult(await client.getMetadata(propertyId));
    }),
]);

export const ANALYTICS_TOOLS = ANALYTICS_REGISTRY.tools;

export async function handleAnalyticsTool(name: string, args: unknown) {
    return ANALYTICS_REGISTRY.dispatch(name, args);
}
