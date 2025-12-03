import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { BusinessProfileClient } from './client.js';

export const BUSINESS_TOOLS: Tool[] = [
    {
        name: 'business_list_accounts',
        description: 'List all Google Business Profile accounts accessible to the user.',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'business_list_locations',
        description: 'List all locations for a specific Business Profile account.',
        inputSchema: {
            type: 'object',
            properties: {
                accountId: {
                    type: 'string',
                    description: 'The account ID (e.g., "accounts/12345")',
                },
            },
            required: ['accountId'],
        },
    },
    {
        name: 'business_get_reviews',
        description: 'Get reviews for a specific location.',
        inputSchema: {
            type: 'object',
            properties: {
                accountId: {
                    type: 'string',
                    description: 'The account ID (e.g., "accounts/12345")',
                },
                locationId: {
                    type: 'string',
                    description: 'The location ID (e.g., "12345" or "locations/12345")',
                },
            },
            required: ['accountId', 'locationId'],
        },
    },
    {
        name: 'business_reply_review',
        description: 'Reply to a specific review.',
        inputSchema: {
            type: 'object',
            properties: {
                accountId: {
                    type: 'string',
                    description: 'The account ID',
                },
                locationId: {
                    type: 'string',
                    description: 'The location ID',
                },
                reviewId: {
                    type: 'string',
                    description: 'The review ID',
                },
                comment: {
                    type: 'string',
                    description: 'The reply text',
                },
            },
            required: ['accountId', 'locationId', 'reviewId', 'comment'],
        },
    },
    {
        name: 'business_update_location',
        description: 'Update a Business Profile location. Use `updateMask` to specify which fields to update.',
        inputSchema: {
            type: 'object',
            properties: {
                locationId: {
                    type: 'string',
                    description: 'The location ID (e.g., "locations/12345")',
                },
                locationData: {
                    type: 'object',
                    description: 'JSON object containing the fields to update',
                },
                updateMask: {
                    type: 'string',
                    description: 'Comma-separated list of fields to update (e.g., "storeCode,phoneNumbers")',
                },
            },
            required: ['locationId', 'locationData', 'updateMask'],
        },
    },
    {
        name: 'business_create_post',
        description: 'Create a Local Post (update, offer, event) for a Business Profile location.',
        inputSchema: {
            type: 'object',
            properties: {
                accountId: {
                    type: 'string',
                    description: 'The account ID (e.g., "accounts/12345")',
                },
                locationId: {
                    type: 'string',
                    description: 'The location ID (e.g., "locations/12345")',
                },
                topicType: {
                    type: 'string',
                    enum: ['STANDARD', 'EVENT', 'OFFER', 'ALERT'],
                    description: 'The type of post.',
                },
                summary: {
                    type: 'string',
                    description: 'The text content of the post.',
                },
                callToAction: {
                    type: 'object',
                    description: 'Optional call to action (actionType, url).',
                },
                event: {
                    type: 'object',
                    description: 'Optional event details (title, schedule). Required for EVENT type.',
                },
                offer: {
                    type: 'object',
                    description: 'Optional offer details (couponCode, redeemOnlineUrl, termsConditions). Required for OFFER type.',
                },
                media: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            sourceUrl: { type: 'string' },
                        },
                    },
                    description: 'Optional list of media items.',
                },
            },
            required: ['accountId', 'locationId', 'topicType', 'summary'],
        },
    },
    {
        name: 'business_list_posts',
        description: 'List Local Posts for a Business Profile location.',
        inputSchema: {
            type: 'object',
            properties: {
                accountId: { type: 'string' },
                locationId: { type: 'string' },
            },
            required: ['accountId', 'locationId'],
        },
    },
    {
        name: 'business_delete_post',
        description: 'Delete a Local Post.',
        inputSchema: {
            type: 'object',
            properties: {
                accountId: { type: 'string' },
                locationId: { type: 'string' },
                postId: { type: 'string' },
            },
            required: ['accountId', 'locationId', 'postId'],
        },
    },
    {
        name: 'business_update_post',
        description: 'Update a Local Post.',
        inputSchema: {
            type: 'object',
            properties: {
                accountId: { type: 'string' },
                locationId: { type: 'string' },
                postId: { type: 'string' },
                postData: {
                    type: 'object',
                    description: 'JSON object containing the fields to update',
                },
                updateMask: {
                    type: 'string',
                    description: 'Comma-separated list of fields to update (e.g., "summary,callToAction")',
                },
            },
            required: ['accountId', 'locationId', 'postId', 'postData', 'updateMask'],
        },
    },
];

export async function handleBusinessTool(name: string, args: any) {
    const client = await BusinessProfileClient.create();

    switch (name) {
        case 'business_list_accounts':
            return {
                content: [{ type: 'text', text: JSON.stringify(await client.listAccounts(), null, 2) }],
            };
        case 'business_list_locations':
            return {
                content: [{ type: 'text', text: JSON.stringify(await client.listLocations(args.accountId), null, 2) }],
            };
        case 'business_get_reviews': {
            // Construct full resource name: accounts/{accountId}/locations/{locationId}
            const locId = args.locationId.replace('locations/', '');
            const accId = args.accountId.replace('accounts/', '');
            const resourceName = `accounts/${accId}/locations/${locId}`;
            return {
                content: [{ type: 'text', text: JSON.stringify(await client.getReviews(resourceName), null, 2) }],
            };
        }
        case 'business_reply_review': {
            const locId = args.locationId.replace('locations/', '');
            const accId = args.accountId.replace('accounts/', '');
            const revId = args.reviewId.replace('reviews/', '');
            const resourceName = `accounts/${accId}/locations/${locId}/reviews/${revId}`;
            return {
                content: [{ type: 'text', text: JSON.stringify(await client.replyToReview(resourceName, args.comment), null, 2) }],
            };
        }
        case 'business_update_location': {
            const locId = args.locationId.replace('locations/', '');
            const resourceName = `locations/${locId}`;
            return {
                content: [{ type: 'text', text: JSON.stringify(await client.updateLocation(resourceName, args.locationData, args.updateMask), null, 2) }],
            };
        }
        case 'business_create_post': {
            const locId = args.locationId.replace('locations/', '');
            const accId = args.accountId.replace('accounts/', '');
            const resourceName = `accounts/${accId}/locations/${locId}`;

            const postData: any = {
                topicType: args.topicType,
                summary: args.summary,
                callToAction: args.callToAction,
                event: args.event,
                offer: args.offer,
                media: args.media,
            };

            return {
                content: [{ type: 'text', text: JSON.stringify(await client.createPost(resourceName, postData), null, 2) }],
            };
        }
        case 'business_list_posts': {
            const locId = args.locationId.replace('locations/', '');
            const accId = args.accountId.replace('accounts/', '');
            const resourceName = `accounts/${accId}/locations/${locId}`;
            return {
                content: [{ type: 'text', text: JSON.stringify(await client.listPosts(resourceName), null, 2) }],
            };
        }
        case 'business_delete_post': {
            const locId = args.locationId.replace('locations/', '');
            const accId = args.accountId.replace('accounts/', '');
            const resourceName = `accounts/${accId}/locations/${locId}/localPosts/${args.postId}`;
            return {
                content: [{ type: 'text', text: JSON.stringify(await client.deletePost(resourceName), null, 2) }],
            };
        }
        case 'business_update_post': {
            const locId = args.locationId.replace('locations/', '');
            const accId = args.accountId.replace('accounts/', '');
            const resourceName = `accounts/${accId}/locations/${locId}/localPosts/${args.postId}`;
            return {
                content: [{ type: 'text', text: JSON.stringify(await client.updatePost(resourceName, args.postData, args.updateMask), null, 2) }],
            };
        }
        default:
            throw new Error(`Unknown tool: ${name}`);
    }
}
