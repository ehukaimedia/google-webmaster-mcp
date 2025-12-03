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
        default:
            throw new Error(`Unknown tool: ${name}`);
    }
}
