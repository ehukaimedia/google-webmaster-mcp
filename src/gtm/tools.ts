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
        name: 'gtm_update_tag',
        description: 'Update an existing HTML tag in GTM',
        inputSchema: {
            type: 'object',
            properties: {
                tagId: { type: 'string', description: 'Tag ID to update' },
                name: { type: 'string', description: 'Tag name' },
                html: { type: 'string', description: 'HTML/JavaScript code for the tag' },
                trigger: { type: 'string', description: 'Trigger type (default: pageview)', default: 'pageview' },
            },
            required: ['tagId', 'name', 'html'],
        },
    },
    {
        name: 'gtm_delete_tag',
        description: 'Delete a tag from GTM',
        inputSchema: {
            type: 'object',
            properties: {
                tagId: { type: 'string', description: 'Tag ID to delete' },
            },
            required: ['tagId'],
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

    {
        name: 'gtm_list_accounts',
        description: 'List all GTM accounts',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'gtm_list_containers',
        description: 'List all GTM containers (optionally for a specific account)',
        inputSchema: {
            type: 'object',
            properties: {
                accountId: { type: 'string', description: 'Account ID (optional)' },
            },
        },
    },
    {
        name: 'gtm_list_workspaces',
        description: 'List all workspaces in the current container',
        inputSchema: {
            type: 'object',
            properties: {
                gtmId: { type: 'string', description: 'GTM container ID (optional)' },
            },
        },
    },
    {
        name: 'gtm_list_triggers',
        description: 'List all triggers in the container',
        inputSchema: {
            type: 'object',
            properties: {
                gtmId: { type: 'string', description: 'GTM container ID (optional)' },
            },
        },
    },
    {
        name: 'gtm_create_trigger',
        description: 'Create a new trigger',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Trigger name' },
                type: { type: 'string', description: 'Trigger type (e.g., pageview, click, customEvent)' },
                filters: {
                    type: 'array',
                    description: 'Array of filter objects',
                    items: {
                        type: 'object',
                        properties: {
                            type: { type: 'string' },
                            parameter: { type: 'array' }
                        }
                    }
                },
            },
            required: ['name', 'type'],
        },
    },
    {
        name: 'gtm_create_variable',
        description: 'Create a new variable',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Variable name' },
                type: { type: 'string', description: 'Variable type (e.g., jsm, v, c)' },
                parameters: {
                    type: 'array',
                    description: 'Array of parameter objects',
                    items: {
                        type: 'object',
                        properties: {
                            type: { type: 'string' },
                            key: { type: 'string' },
                            value: { type: 'string' }
                        }
                    }
                },
            },
            required: ['name', 'type'],
        },
    },
    {
        name: 'gtm_delete_variable',
        description: 'Delete a variable',
        inputSchema: {
            type: 'object',
            properties: {
                variableId: { type: 'string', description: 'Variable ID' },
            },
            required: ['variableId'],
        },
    },
    {
        name: 'gtm_list_versions',
        description: 'List container versions',
        inputSchema: {
            type: 'object',
            properties: {
                gtmId: { type: 'string', description: 'GTM container ID (optional)' },
            },
        },
    },
    {
        name: 'gtm_validate_workspace',
        description: 'Validate workspace for broken references and missing variables',
        inputSchema: {
            type: 'object',
            properties: {
                gtmId: { type: 'string', description: 'GTM container ID (optional)' },
            },
        },
    },
    {
        name: 'gtm_create_ga4_configuration_tag',
        description: 'Create a GA4 Configuration Tag',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Tag name' },
                measurementId: { type: 'string', description: 'GA4 Measurement ID (G-XXXXXXXXXX)' },
                options: {
                    type: 'object',
                    properties: {
                        sendPageView: { type: 'boolean' },
                        triggerType: { type: 'string' },
                        fieldsToSet: { type: 'object' }
                    }
                }
            },
            required: ['name', 'measurementId'],
        },
    },
    {
        name: 'gtm_create_ga4_event_tag',
        description: 'Create a GA4 Event Tag',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Tag name' },
                eventName: { type: 'string', description: 'GA4 Event Name' },
                measurementId: { type: 'string', description: 'Measurement ID (optional if configTagId used)' },
                options: {
                    type: 'object',
                    properties: {
                        configTagId: { type: 'string' },
                        eventParameters: { type: 'object' },
                        triggerType: { type: 'string' },
                        triggerId: { type: 'string' },
                        resolveVariables: { type: 'boolean' }
                    }
                }
            },
            required: ['name', 'eventName'],
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

        case 'gtm_update_tag': {
            const tag = await gtmManager.updateTag(args.tagId, args.name, args.html, args.trigger);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Updated tag: ${tag.name} (ID: ${tag.tagId})`,
                    },
                ],
            };
        }

        case 'gtm_delete_tag': {
            await gtmManager.deleteTag(args.tagId);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Deleted tag: ${args.tagId}`,
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

        case 'gtm_list_accounts': {
            const accounts = await gtmManager.listAccounts();
            return {
                content: [{ type: 'text', text: JSON.stringify(accounts, null, 2) }]
            };
        }

        case 'gtm_list_containers': {
            const containers = await gtmManager.listContainers(args.accountId);
            return {
                content: [{ type: 'text', text: JSON.stringify(containers, null, 2) }]
            };
        }

        case 'gtm_list_workspaces': {
            if (args?.gtmId) process.env.GTM_ID = args.gtmId;
            const workspaces = await gtmManager.listWorkspaces();
            return {
                content: [{ type: 'text', text: JSON.stringify(workspaces, null, 2) }]
            };
        }

        case 'gtm_list_triggers': {
            if (args?.gtmId) process.env.GTM_ID = args.gtmId;
            const triggers = await gtmManager.listTriggers();
            return {
                content: [{ type: 'text', text: JSON.stringify(triggers, null, 2) }]
            };
        }

        case 'gtm_create_trigger': {
            const trigger = await gtmManager.createTrigger(args.name, args.type, args.filters);
            return {
                content: [{ type: 'text', text: `Created trigger: ${trigger.name} (${trigger.triggerId})` }]
            };
        }

        case 'gtm_create_variable': {
            const variable = await gtmManager.createVariable(args.name, args.type, args.parameters);
            return {
                content: [{ type: 'text', text: `Created variable: ${variable.name} (${variable.variableId})` }]
            };
        }

        case 'gtm_delete_variable': {
            await gtmManager.deleteVariable(args.variableId);
            return {
                content: [{ type: 'text', text: `Deleted variable: ${args.variableId}` }]
            };
        }

        case 'gtm_list_versions': {
            if (args?.gtmId) process.env.GTM_ID = args.gtmId;
            const versions = await gtmManager.listVersions();
            return {
                content: [{ type: 'text', text: JSON.stringify(versions, null, 2) }]
            };
        }

        case 'gtm_validate_workspace': {
            if (args?.gtmId) process.env.GTM_ID = args.gtmId;
            const result = await gtmManager.validateWorkspace();
            return {
                content: [{ type: 'text', text: result.ok ? 'Workspace is valid.' : `Issues found:\n${result.issues.join('\n')}` }]
            };
        }

        case 'gtm_create_ga4_configuration_tag': {
            const tag = await gtmManager.createGa4ConfigurationTag(args.name, args.measurementId, args.options);
            return {
                content: [{ type: 'text', text: `Created GA4 Config Tag: ${tag.name} (${tag.tagId})` }]
            };
        }

        case 'gtm_create_ga4_event_tag': {
            const tag = await gtmManager.createGa4EventTag(args.name, args.measurementId, args.eventName, args.options);
            return {
                content: [{ type: 'text', text: `Created GA4 Event Tag: ${tag.name} (${tag.tagId})` }]
            };
        }

        default:
            throw new Error(`Unknown GTM tool: ${name}`);
    }
}
