import { GSCClient } from './client.js';
import { createToolRegistry, defineTool, jsonResult } from '../mcp/tool-registry.js';

let gscClient: GSCClient | null = null;

async function getClient() {
    if (!gscClient) {
        gscClient = await GSCClient.create();
    }
    return gscClient;
}

interface GscAnalyticsQueryArgs {
    siteUrl: string;
    startDate: string;
    endDate: string;
    dimensions?: string[];
    rowLimit?: number;
}

interface GscInspectUrlArgs {
    siteUrl: string;
    inspectionUrl: string;
    languageCode?: string;
}

interface GscSubmitSitemapArgs {
    siteUrl: string;
    feedpath: string;
}

interface GscSiteUrlArgs {
    siteUrl: string;
}

interface GscSitemapExtractArgs {
    sitemapUrl: string;
}

interface GscPerformanceOverviewArgs {
    siteUrl: string;
    days?: number;
}

export const GSC_REGISTRY = createToolRegistry([
    defineTool({
        name: 'gsc_list_sites',
        description: 'List all Google Search Console properties the user has access to.',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    }, async () => {
        const client = await getClient();
        return jsonResult(await client.listSites());
    }),
    defineTool<GscAnalyticsQueryArgs>({
        name: 'gsc_analytics_query',
        description: 'Query search analytics data (clicks, impressions, CTR, position).',
        inputSchema: {
            type: 'object',
            properties: {
                siteUrl: { type: 'string', description: 'The URL of the property to query.' },
                startDate: { type: 'string', description: 'Start date in YYYY-MM-DD format.' },
                endDate: { type: 'string', description: 'End date in YYYY-MM-DD format.' },
                dimensions: {
                    type: 'array',
                    items: { type: 'string', enum: ['date', 'query', 'page', 'country', 'device', 'searchAppearance'] },
                    description: 'Dimensions to group by.',
                },
                rowLimit: { type: 'number', description: 'Maximum number of rows to return.' },
            },
            required: ['siteUrl', 'startDate', 'endDate'],
        },
    }, async ({ siteUrl, startDate, endDate, dimensions, rowLimit }) => {
        const client = await getClient();
        return jsonResult(await client.queryAnalytics(siteUrl, startDate, endDate, dimensions, rowLimit));
    }),
    defineTool<GscInspectUrlArgs>({
        name: 'gsc_inspect_url',
        description: 'Inspect a URL to see its indexing status and mobile usability.',
        inputSchema: {
            type: 'object',
            properties: {
                siteUrl: { type: 'string', description: 'The URL of the property.' },
                inspectionUrl: { type: 'string', description: 'The URL to inspect.' },
                languageCode: { type: 'string', description: 'Language code for localized results (default: en-US).' },
            },
            required: ['siteUrl', 'inspectionUrl'],
        },
    }, async ({ siteUrl, inspectionUrl, languageCode }) => {
        const client = await getClient();
        return jsonResult(await client.inspectUrl(siteUrl, inspectionUrl, languageCode));
    }),
    defineTool<GscSubmitSitemapArgs>({
        name: 'gsc_sitemaps_submit',
        description: 'Submit a sitemap for a property.',
        inputSchema: {
            type: 'object',
            properties: {
                siteUrl: { type: 'string', description: 'The URL of the property.' },
                feedpath: { type: 'string', description: 'The URL of the sitemap to submit.' },
            },
            required: ['siteUrl', 'feedpath'],
        },
    }, async ({ siteUrl, feedpath }) => {
        const client = await getClient();
        return jsonResult(await client.submitSitemap(siteUrl, feedpath));
    }),
    defineTool<GscSiteUrlArgs>({
        name: 'gsc_list_sitemaps',
        description: 'List sitemaps submitted for a property.',
        inputSchema: {
            type: 'object',
            properties: {
                siteUrl: { type: 'string', description: 'The URL of the property.' },
            },
            required: ['siteUrl'],
        },
    }, async ({ siteUrl }) => {
        const client = await getClient();
        return jsonResult(await client.listSitemaps(siteUrl));
    }),
    defineTool<GscSitemapExtractArgs>({
        name: 'gsc_sitemap_extract_urls',
        description: 'Extract all URLs from a sitemap (or sitemap index).',
        inputSchema: {
            type: 'object',
            properties: {
                sitemapUrl: { type: 'string', description: 'The public HTTP(S) URL of the sitemap to parse.' },
            },
            required: ['sitemapUrl'],
        },
    }, async ({ sitemapUrl }) => {
        const client = await getClient();
        return jsonResult(await client.fetchSitemapUrls(sitemapUrl));
    }),
    defineTool<GscPerformanceOverviewArgs>({
        name: 'gsc_get_performance_overview',
        description: 'Get a quick performance overview (clicks, impressions, top pages) for a specific period.',
        inputSchema: {
            type: 'object',
            properties: {
                siteUrl: { type: 'string', description: 'The URL of the property.' },
                days: { type: 'number', description: 'Number of days to look back (default: 30).' },
            },
            required: ['siteUrl'],
        },
    }, async ({ siteUrl, days }) => {
        const client = await getClient();
        return jsonResult(await client.getPerformanceOverview(siteUrl, days));
    }),
]);

export const GSC_TOOLS = GSC_REGISTRY.tools;

export async function handleGscTool(name: string, args: unknown) {
    return GSC_REGISTRY.dispatch(name, args);
}
