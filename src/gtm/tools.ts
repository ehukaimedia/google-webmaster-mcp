import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { GTMManager } from './client.js';

const gtmManager = new GTMManager();

export const GTM_TOOLS: Tool[] = [
    {
        name: 'gtm_list_tags',
        description: 'List all tags in the GTM container',
        inputSchema: {
            type: 'object',
            properties: {
                gtmId: {
                    type: 'string',
                    description: 'GTM container ID (optional, uses env default)',
                },
            },
        },
    },
    {
        name: 'gtm_create_tag',
        description: 'Create a new HTML tag in GTM',
        inputSchema: {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    description: 'Tag name',
                },
                html: {
                    type: 'string',
                    description: 'HTML/JavaScript code for the tag',
                },
                trigger: {
                    type: 'string',
                    description: 'Trigger type (default: pageview)',
                    default: 'pageview',
                },
            },
            required: ['name', 'html'],
        },
    },
    {
        name: 'gtm_list_variables',
        description: 'List all variables in the GTM container',
        inputSchema: {
            type: 'object',
            properties: {
                gtmId: {
                    type: 'string',
                    description: 'GTM container ID (optional, uses env default)',
                },
            },
        },
    },
    {
        name: 'gtm_create_version',
        description: 'Create a container version from the active workspace',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Version name (optional)' },
                notes: { type: 'string', description: 'Version notes (optional)' },
            },
        },
    },
    {
        name: 'gtm_publish_version',
        description: 'Publish a specific container version',
        inputSchema: {
            type: 'object',
            properties: {
                versionId: { type: 'string', description: 'Container version ID' },
            },
            required: ['versionId'],
        },
    },
];

export async function handleGtmTool(name: string, args: any) {
    switch (name) {
        case 'gtm_list_tags': {
            if (args?.gtmId) process.env.GTM_ID = args.gtmId;
            const tags = await gtmManager.listTags();
            return {
                content: [
                    {
                        type: 'text',
                        text: `Found ${tags.length} tags:\n${tags
                            .map((tag: any) => `- ${tag.name} (${tag.type}) - ID: ${tag.tagId}`)
                            .join('\n')}`,
                    },
                ],
            };
        }

        case 'gtm_create_tag': {
            const tag = await gtmManager.createTag(args.name, args.html, args.trigger);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Created tag: ${tag.name} (ID: ${tag.tagId})`,
                    },
                ],
            };
        }

        case 'gtm_list_variables': {
            if (args?.gtmId) process.env.GTM_ID = args.gtmId;
            const variables = await gtmManager.listVariables();
            return {
                content: [
                    {
                        type: 'text',
                        text: `Found ${variables.length} variables:\n${variables
                            .map((v: any) => `- ${v.name} (${v.type}) - ID: ${v.variableId}`)
                            .join('\n')}`,
                    },
                ],
            };
        }

        case 'gtm_create_version': {
            const { versionId } = await gtmManager.createVersion(args.name, args.notes);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Created version: ${versionId}`,
                    },
                ],
            };
        }

        case 'gtm_publish_version': {
            await gtmManager.publishVersion(args.versionId);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Published version: ${args.versionId}`,
                    },
                ],
            };
        }

        default:
            throw new Error(`Unknown GTM tool: ${name}`);
    }
}
