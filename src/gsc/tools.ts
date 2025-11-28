import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { GSCClient } from './client.js';

let gscClient: GSCClient | null = null;

async function getClient() {
    if (!gscClient) {
        gscClient = await GSCClient.create();
    }
    return gscClient;
}

export const GSC_TOOLS: Tool[] = [
    {
        name: 'gsc_list_sites',
        description: 'List all Google Search Console properties the user has access to.',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
    {
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
    },
    {
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
    },
    {
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
    },
    {
        name: 'gsc_list_sitemaps',
        description: 'List sitemaps submitted for a property.',
        inputSchema: {
            type: 'object',
            properties: {
                siteUrl: { type: 'string', description: 'The URL of the property.' },
            },
            required: ['siteUrl'],
        },
    },
    {
        name: 'gsc_sitemap_extract_urls',
        description: 'Extract all URLs from a sitemap (or sitemap index).',
        inputSchema: {
            type: 'object',
            properties: {
                sitemapUrl: { type: 'string', description: 'The URL of the sitemap to parse.' },
            },
            required: ['sitemapUrl'],
        },
    },
];

export async function handleGscTool(name: string, args: any) {
    const client = await getClient();

    switch (name) {
        case 'gsc_list_sites': {
            const sites = await client.listSites();
            return {
                content: [{ type: 'text', text: JSON.stringify(sites, null, 2) }],
            };
        }
        case 'gsc_analytics_query': {
            const { siteUrl, startDate, endDate, dimensions, rowLimit } = args;
            const data = await client.queryAnalytics(siteUrl, startDate, endDate, dimensions, rowLimit);
            return {
                content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
            };
        }
        case 'gsc_inspect_url': {
            const { siteUrl, inspectionUrl, languageCode } = args;
            const result = await client.inspectUrl(siteUrl, inspectionUrl, languageCode);
            return {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
        }
        case 'gsc_sitemaps_submit': {
            const { siteUrl, feedpath } = args;
            const result = await client.submitSitemap(siteUrl, feedpath);
            return {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
        }
        case 'gsc_list_sitemaps': {
            const { siteUrl } = args;
            const result = await client.listSitemaps(siteUrl);
            return {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
        }
        case 'gsc_sitemap_extract_urls': {
            const { sitemapUrl } = args;
            const result = await client.fetchSitemapUrls(sitemapUrl);
            return {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
        }
        default:
            throw new Error(`Unknown GSC tool: ${name}`);
    }
}
