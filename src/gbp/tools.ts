import { createToolRegistry, defineTool, jsonResult } from '../mcp/tool-registry.js';
import { GbpClient, DEFAULT_LOCATION_READ_MASK } from './client.js';
import { parsePostName, parseReviewName, requireV4Parent } from './names.js';
import * as v4 from './v4.js';

let gbpClient: GbpClient | null = null;

async function getClient() {
    if (!gbpClient) {
        gbpClient = await GbpClient.create();
    }
    return gbpClient;
}

interface GbpAccountArgs {
    pageToken?: string;
}

interface GbpLocationsArgs {
    accountId: string;
    readMask?: string;
    pageToken?: string;
}

interface GbpGetLocationArgs {
    locationId: string;
    readMask?: string;
}

interface GbpUpdateLocationArgs {
    locationId: string;
    updateMask: string;
    title?: string;
    websiteUri?: string;
    primaryPhone?: string;
    profileDescription?: string;
    storeCode?: string;
    regularHours?: Record<string, unknown>;
    validateOnly?: boolean;
}

interface GbpLocationPageArgs {
    accountId: string;
    locationId: string;
    pageToken?: string;
}

interface GbpReplyReviewArgs {
    accountId: string;
    locationId: string;
    reviewId: string;
    comment: string;
}

interface GbpDeleteReplyArgs {
    accountId: string;
    locationId: string;
    reviewId: string;
}

interface GbpCreatePostArgs {
    accountId: string;
    locationId: string;
    topicType: 'STANDARD' | 'EVENT' | 'OFFER';
    summary: string;
    callToAction?: { actionType?: string; url?: string };
    event?: Record<string, unknown>;
    offer?: Record<string, unknown>;
    media?: Array<{ sourceUrl: string; mediaFormat?: string }>;
}

interface GbpDeletePostArgs {
    accountId: string;
    locationId: string;
    postId: string;
}

interface GbpPerformanceArgs {
    locationId: string;
    startDate: string;
    endDate: string;
    dailyMetrics?: string[];
}

interface GbpSearchKeywordsArgs {
    locationId: string;
    startMonth: string;
    endMonth: string;
    pageToken?: string;
}

export const GBP_REGISTRY = createToolRegistry([
    defineTool<GbpAccountArgs>({
        name: 'gbp_list_accounts',
        description: 'List Google Business Profile accounts the user can manage. Disabled unless GBP_ENABLED=true.',
        inputSchema: {
            type: 'object',
            properties: {
                pageToken: { type: 'string', description: 'Pagination token from a previous list call.' },
            },
        },
    }, async ({ pageToken }) => {
        const client = await getClient();
        return jsonResult(await client.listAccounts(pageToken));
    }),
    defineTool<GbpLocationsArgs>({
        name: 'gbp_list_locations',
        description: 'List locations for a Business Profile account.',
        inputSchema: {
            type: 'object',
            properties: {
                accountId: { type: 'string', description: 'Account id or accounts/{id}.' },
                readMask: { type: 'string', description: `Comma-separated fields. Default: ${DEFAULT_LOCATION_READ_MASK}` },
                pageToken: { type: 'string' },
            },
            required: ['accountId'],
        },
    }, async ({ accountId, readMask, pageToken }) => {
        const client = await getClient();
        return jsonResult(await client.listLocations(accountId, readMask, pageToken));
    }),
    defineTool<GbpGetLocationArgs>({
        name: 'gbp_get_location',
        description: 'Get one Business Profile location. Requires an explicit or default readMask.',
        inputSchema: {
            type: 'object',
            properties: {
                locationId: { type: 'string', description: 'locations/{id} or a bare location id.' },
                readMask: { type: 'string' },
            },
            required: ['locationId'],
        },
    }, async ({ locationId, readMask }) => {
        const client = await getClient();
        return jsonResult(await client.getLocation(locationId, readMask));
    }),
    defineTool<GbpUpdateLocationArgs>({
        name: 'gbp_update_location',
        description: 'Patch listing facts. validateOnly defaults to true. Confirm before setting validateOnly=false.',
        inputSchema: {
            type: 'object',
            properties: {
                locationId: { type: 'string' },
                updateMask: { type: 'string', description: 'Comma-separated fields to patch, e.g. title,websiteUri,phoneNumbers,profile.description' },
                title: { type: 'string' },
                websiteUri: { type: 'string' },
                primaryPhone: { type: 'string' },
                profileDescription: { type: 'string' },
                storeCode: { type: 'string' },
                regularHours: { type: 'object' },
                validateOnly: { type: 'boolean', description: 'Default true. Dry-run unless explicitly false after confirmation.' },
            },
            required: ['locationId', 'updateMask'],
        },
    }, async ({ locationId, updateMask, title, websiteUri, primaryPhone, profileDescription, storeCode, regularHours, validateOnly }) => {
        const client = await getClient();
        const location: Record<string, unknown> = {};
        if (title !== undefined) location.title = title;
        if (websiteUri !== undefined) location.websiteUri = websiteUri;
        if (primaryPhone !== undefined) location.phoneNumbers = { primaryPhone };
        if (profileDescription !== undefined) location.profile = { description: profileDescription };
        if (storeCode !== undefined) location.storeCode = storeCode;
        if (regularHours !== undefined) location.regularHours = regularHours;
        return jsonResult(await client.updateLocation(locationId, location, updateMask, validateOnly !== false));
    }),
    defineTool<GbpLocationPageArgs>({
        name: 'gbp_list_reviews',
        description: 'List reviews for a location. Requires Google My Business API v4 access.',
        inputSchema: {
            type: 'object',
            properties: {
                accountId: { type: 'string' },
                locationId: { type: 'string' },
                pageToken: { type: 'string' },
            },
            required: ['accountId', 'locationId'],
        },
    }, async ({ accountId, locationId, pageToken }) => {
        return jsonResult(await v4.listReviews(requireV4Parent(locationId, accountId), pageToken));
    }),
    defineTool<GbpReplyReviewArgs>({
        name: 'gbp_reply_review',
        description: 'Create or replace a review reply. Confirm before sending. Customer-visible.',
        inputSchema: {
            type: 'object',
            properties: {
                accountId: { type: 'string' },
                locationId: { type: 'string' },
                reviewId: { type: 'string' },
                comment: { type: 'string' },
            },
            required: ['accountId', 'locationId', 'reviewId', 'comment'],
        },
    }, async ({ accountId, locationId, reviewId, comment }) => {
        return jsonResult(await v4.replyToReview(parseReviewName(accountId, locationId, reviewId), comment));
    }),
    defineTool<GbpDeleteReplyArgs>({
        name: 'gbp_delete_review_reply',
        description: 'Delete a review reply. Confirm before sending.',
        inputSchema: {
            type: 'object',
            properties: {
                accountId: { type: 'string' },
                locationId: { type: 'string' },
                reviewId: { type: 'string' },
            },
            required: ['accountId', 'locationId', 'reviewId'],
        },
    }, async ({ accountId, locationId, reviewId }) => {
        return jsonResult(await v4.deleteReviewReply(parseReviewName(accountId, locationId, reviewId)));
    }),
    defineTool<GbpLocationPageArgs>({
        name: 'gbp_list_posts',
        description: 'List local posts for a location. Requires Google My Business API v4 access.',
        inputSchema: {
            type: 'object',
            properties: {
                accountId: { type: 'string' },
                locationId: { type: 'string' },
                pageToken: { type: 'string' },
            },
            required: ['accountId', 'locationId'],
        },
    }, async ({ accountId, locationId, pageToken }) => {
        return jsonResult(await v4.listPosts(requireV4Parent(locationId, accountId), pageToken));
    }),
    defineTool<GbpCreatePostArgs>({
        name: 'gbp_create_post',
        description: 'Create a STANDARD, EVENT, or OFFER local post. Confirm before sending. Customer-visible.',
        inputSchema: {
            type: 'object',
            properties: {
                accountId: { type: 'string' },
                locationId: { type: 'string' },
                topicType: { type: 'string', enum: ['STANDARD', 'EVENT', 'OFFER'] },
                summary: { type: 'string' },
                callToAction: {
                    type: 'object',
                    properties: {
                        actionType: { type: 'string' },
                        url: { type: 'string' },
                    },
                },
                event: { type: 'object' },
                offer: { type: 'object' },
                media: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            sourceUrl: { type: 'string' },
                            mediaFormat: { type: 'string' },
                        },
                        required: ['sourceUrl'],
                    },
                },
            },
            required: ['accountId', 'locationId', 'topicType', 'summary'],
        },
    }, async ({ accountId, locationId, topicType, summary, callToAction, event, offer, media }) => {
        if (topicType === 'EVENT' && !event) {
            throw new Error('event is required when topicType is EVENT');
        }
        if (topicType === 'OFFER' && !offer) {
            throw new Error('offer is required when topicType is OFFER');
        }
        const postData: Record<string, unknown> = {
            languageCode: 'en',
            topicType,
            summary,
        };
        if (callToAction) postData.callToAction = callToAction;
        if (event) postData.event = event;
        if (offer) postData.offer = offer;
        if (media) {
            postData.media = media.map((item) => ({
                sourceUrl: item.sourceUrl,
                mediaFormat: item.mediaFormat || 'PHOTO',
            }));
        }
        return jsonResult(await v4.createPost(requireV4Parent(locationId, accountId), postData));
    }),
    defineTool<GbpDeletePostArgs>({
        name: 'gbp_delete_post',
        description: 'Delete a local post. Confirm before sending.',
        inputSchema: {
            type: 'object',
            properties: {
                accountId: { type: 'string' },
                locationId: { type: 'string' },
                postId: { type: 'string' },
            },
            required: ['accountId', 'locationId', 'postId'],
        },
    }, async ({ accountId, locationId, postId }) => {
        return jsonResult(await v4.deletePost(parsePostName(accountId, locationId, postId)));
    }),
    defineTool<GbpPerformanceArgs>({
        name: 'gbp_get_performance',
        description: 'Fetch daily Business Profile performance metrics for a location.',
        inputSchema: {
            type: 'object',
            properties: {
                locationId: { type: 'string' },
                startDate: { type: 'string', description: 'YYYY-MM-DD' },
                endDate: { type: 'string', description: 'YYYY-MM-DD' },
                dailyMetrics: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Optional metric names. Defaults to impressions, calls, website clicks, and direction requests.',
                },
            },
            required: ['locationId', 'startDate', 'endDate'],
        },
    }, async ({ locationId, startDate, endDate, dailyMetrics }) => {
        const client = await getClient();
        return jsonResult(await client.getPerformance(locationId, startDate, endDate, dailyMetrics));
    }),
    defineTool<GbpSearchKeywordsArgs>({
        name: 'gbp_list_search_keywords',
        description: 'List monthly search-keyword impressions for a location.',
        inputSchema: {
            type: 'object',
            properties: {
                locationId: { type: 'string' },
                startMonth: { type: 'string', description: 'YYYY-MM' },
                endMonth: { type: 'string', description: 'YYYY-MM' },
                pageToken: { type: 'string' },
            },
            required: ['locationId', 'startMonth', 'endMonth'],
        },
    }, async ({ locationId, startMonth, endMonth, pageToken }) => {
        const client = await getClient();
        return jsonResult(await client.listSearchKeywords(locationId, startMonth, endMonth, pageToken));
    }),
]);
