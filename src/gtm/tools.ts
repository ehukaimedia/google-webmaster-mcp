import { GTMManager } from './client.js';
import type { GtmCondition, GtmGa4ConfigurationOptions, GtmGa4EventOptions, GtmTag, GtmVariable } from './types.js';
import { createToolRegistry, defineTool, jsonResult, textResult } from '../mcp/tool-registry.js';

interface GtmScopedArgs {
    gtmId?: string;
    workspaceId?: string;
}

interface GtmCreateTagArgs extends GtmScopedArgs {
    name: string;
    html: string;
    trigger?: string;
    triggerName?: string;
}

interface GtmUpdateTagArgs extends GtmScopedArgs {
    tagId: string;
    name: string;
    html: string;
    trigger?: string;
    triggerName?: string;
}

interface GtmDeleteTagArgs extends GtmScopedArgs {
    tagId: string;
}

interface GtmCreateVersionArgs extends GtmScopedArgs {
    name?: string;
    notes?: string;
}

interface GtmPublishVersionArgs extends GtmScopedArgs {
    versionId: string;
}

interface GtmListContainersArgs {
    accountId?: string;
}

interface GtmCreateTriggerArgs extends GtmScopedArgs {
    name: string;
    type: string;
    filters?: GtmCondition[];
}

interface GtmCreateVariableArgs extends GtmScopedArgs {
    name: string;
    type: string;
    parameters?: GtmVariable['parameter'];
}

interface GtmDeleteVariableArgs extends GtmScopedArgs {
    variableId: string;
}

interface GtmCreateGa4ConfigurationTagArgs extends GtmScopedArgs {
    name: string;
    measurementId: string;
    options?: GtmGa4ConfigurationOptions;
}

interface GtmCreateGa4EventTagArgs extends GtmScopedArgs {
    name: string;
    eventName: string;
    measurementId?: string;
    options?: GtmGa4EventOptions;
}

async function getManager(args?: GtmScopedArgs): Promise<GTMManager> {
    const manager = new GTMManager(args?.workspaceId);

    if (args?.gtmId) {
        await manager.findContainer(args.gtmId);
    }

    return manager;
}

function summarizeTags(tags: GtmTag[]): string {
    return `Found ${tags.length} tags:\n${tags
        .map((tag) => `- ${tag.name} (${tag.type}) - ID: ${tag.tagId}`)
        .join('\n')}`;
}

function summarizeVariables(variables: GtmVariable[]): string {
    return `Found ${variables.length} variables:\n${variables
        .map((variable) => `- ${variable.name} (${variable.type}) - ID: ${variable.variableId}`)
        .join('\n')}`;
}

export const GTM_REGISTRY = createToolRegistry([
    defineTool<GtmScopedArgs>({
        name: 'gtm_list_tags',
        description: 'List all tags in the GTM container',
        inputSchema: {
            type: 'object',
            properties: {
                gtmId: {
                    type: 'string',
                    description: 'GTM container ID (optional, uses env default)',
                },
                workspaceId: {
                    type: 'string',
                    description: 'GTM workspace ID (optional, uses GTM_WORKSPACE_ID when omitted)',
                },
            },
        },
    }, async (args) => {
        const manager = await getManager(args);
        return textResult(summarizeTags(await manager.listTags()));
    }),
    defineTool<GtmCreateTagArgs>({
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
                triggerName: {
                    type: 'string',
                    description: 'Name of the trigger to use or create (Smart Resolution)',
                },
                gtmId: {
                    type: 'string',
                    description: 'GTM container ID (optional, uses env default)',
                },
                workspaceId: {
                    type: 'string',
                    description: 'GTM workspace ID (optional, uses GTM_WORKSPACE_ID when omitted)',
                },
            },
            required: ['name', 'html'],
        },
    }, async ({ name, html, trigger, triggerName, gtmId, workspaceId }) => {
        const manager = await getManager({ gtmId, workspaceId });
        const tag = await manager.createTag(name, html, trigger, triggerName);
        return textResult(`Created tag: ${tag.name} (ID: ${tag.tagId})`);
    }),
    defineTool<GtmUpdateTagArgs>({
        name: 'gtm_update_tag',
        description: 'Update an existing HTML tag in GTM',
        inputSchema: {
            type: 'object',
            properties: {
                tagId: { type: 'string', description: 'Tag ID to update' },
                name: { type: 'string', description: 'Tag name' },
                html: { type: 'string', description: 'HTML/JavaScript code for the tag' },
                trigger: { type: 'string', description: 'Trigger type to replace the existing trigger mapping' },
                triggerName: {
                    type: 'string',
                    description: 'Name of the trigger to use or create when changing to a non-pageview trigger',
                },
                gtmId: { type: 'string', description: 'GTM container ID (optional, uses env default)' },
                workspaceId: {
                    type: 'string',
                    description: 'GTM workspace ID (optional, uses GTM_WORKSPACE_ID when omitted)',
                },
            },
            required: ['tagId', 'name', 'html'],
        },
    }, async ({ tagId, name, html, trigger, triggerName, gtmId, workspaceId }) => {
        const manager = await getManager({ gtmId, workspaceId });
        const tag = await manager.updateTag(tagId, name, html, trigger, triggerName);
        return textResult(`Updated tag: ${tag.name} (ID: ${tag.tagId})`);
    }),
    defineTool<GtmDeleteTagArgs>({
        name: 'gtm_delete_tag',
        description: 'Delete a tag from GTM',
        inputSchema: {
            type: 'object',
            properties: {
                tagId: { type: 'string', description: 'Tag ID to delete' },
                gtmId: { type: 'string', description: 'GTM container ID (optional, uses env default)' },
                workspaceId: {
                    type: 'string',
                    description: 'GTM workspace ID (optional, uses GTM_WORKSPACE_ID when omitted)',
                },
            },
            required: ['tagId'],
        },
    }, async ({ tagId, gtmId, workspaceId }) => {
        const manager = await getManager({ gtmId, workspaceId });
        await manager.deleteTag(tagId);
        return textResult(`Deleted tag: ${tagId}`);
    }),
    defineTool<GtmScopedArgs>({
        name: 'gtm_list_variables',
        description: 'List all variables in the GTM container',
        inputSchema: {
            type: 'object',
            properties: {
                gtmId: {
                    type: 'string',
                    description: 'GTM container ID (optional, uses env default)',
                },
                workspaceId: {
                    type: 'string',
                    description: 'GTM workspace ID (optional, uses GTM_WORKSPACE_ID when omitted)',
                },
            },
        },
    }, async (args) => {
        const manager = await getManager(args);
        return textResult(summarizeVariables(await manager.listVariables()));
    }),
    defineTool<GtmCreateVersionArgs>({
        name: 'gtm_create_version',
        description: 'Create a container version from the active workspace',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Version name (optional)' },
                notes: { type: 'string', description: 'Version notes (optional)' },
                gtmId: { type: 'string', description: 'GTM container ID (optional, uses env default)' },
                workspaceId: {
                    type: 'string',
                    description: 'GTM workspace ID (optional, uses GTM_WORKSPACE_ID when omitted)',
                },
            },
        },
    }, async ({ name, notes, gtmId, workspaceId }) => {
        const manager = await getManager({ gtmId, workspaceId });
        const { versionId } = await manager.createVersion(name, notes);
        return textResult(`Created version: ${versionId}`);
    }),
    defineTool<GtmPublishVersionArgs>({
        name: 'gtm_publish_version',
        description: 'Publish a specific container version',
        inputSchema: {
            type: 'object',
            properties: {
                versionId: { type: 'string', description: 'Container version ID' },
                gtmId: { type: 'string', description: 'GTM container ID (optional, uses env default)' },
                workspaceId: {
                    type: 'string',
                    description: 'GTM workspace ID (optional, uses GTM_WORKSPACE_ID when omitted)',
                },
            },
            required: ['versionId'],
        },
    }, async ({ versionId, gtmId, workspaceId }) => {
        const manager = await getManager({ gtmId, workspaceId });
        await manager.publishVersion(versionId);
        return textResult(`Published version: ${versionId}`);
    }),
    defineTool({
        name: 'gtm_list_accounts',
        description: 'List all GTM accounts',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    }, async () => jsonResult(await (await getManager()).listAccounts())),
    defineTool<GtmListContainersArgs>({
        name: 'gtm_list_containers',
        description: 'List all GTM containers (optionally for a specific account)',
        inputSchema: {
            type: 'object',
            properties: {
                accountId: { type: 'string', description: 'Account ID (optional)' },
            },
        },
    }, async ({ accountId }) => jsonResult(await (await getManager()).listContainers(accountId))),
    defineTool<GtmScopedArgs>({
        name: 'gtm_list_workspaces',
        description: 'List all workspaces in the current container',
        inputSchema: {
            type: 'object',
            properties: {
                gtmId: { type: 'string', description: 'GTM container ID (optional)' },
                workspaceId: {
                    type: 'string',
                    description: 'GTM workspace ID (optional, uses GTM_WORKSPACE_ID when omitted)',
                },
            },
        },
    }, async (args) => {
        const manager = await getManager(args);
        return jsonResult(await manager.listWorkspaces());
    }),
    defineTool<GtmScopedArgs>({
        name: 'gtm_list_triggers',
        description: 'List all triggers in the container',
        inputSchema: {
            type: 'object',
            properties: {
                gtmId: { type: 'string', description: 'GTM container ID (optional)' },
                workspaceId: {
                    type: 'string',
                    description: 'GTM workspace ID (optional, uses GTM_WORKSPACE_ID when omitted)',
                },
            },
        },
    }, async (args) => {
        const manager = await getManager(args);
        return jsonResult(await manager.listTriggers());
    }),
    defineTool<GtmCreateTriggerArgs>({
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
                            parameter: { type: 'array' },
                        },
                    },
                },
                gtmId: { type: 'string', description: 'GTM container ID (optional, uses env default)' },
                workspaceId: {
                    type: 'string',
                    description: 'GTM workspace ID (optional, uses GTM_WORKSPACE_ID when omitted)',
                },
            },
            required: ['name', 'type'],
        },
    }, async ({ name, type, filters, gtmId, workspaceId }) => {
        const manager = await getManager({ gtmId, workspaceId });
        const trigger = await manager.createTrigger(name, type, filters);
        return textResult(`Created trigger: ${trigger.name} (${trigger.triggerId})`);
    }),
    defineTool<GtmCreateVariableArgs>({
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
                            value: { type: 'string' },
                        },
                    },
                },
                gtmId: { type: 'string', description: 'GTM container ID (optional, uses env default)' },
                workspaceId: {
                    type: 'string',
                    description: 'GTM workspace ID (optional, uses GTM_WORKSPACE_ID when omitted)',
                },
            },
            required: ['name', 'type'],
        },
    }, async ({ name, type, parameters, gtmId, workspaceId }) => {
        const manager = await getManager({ gtmId, workspaceId });
        const variable = await manager.createVariable(name, type, parameters);
        return textResult(`Created variable: ${variable.name} (${variable.variableId})`);
    }),
    defineTool<GtmDeleteVariableArgs>({
        name: 'gtm_delete_variable',
        description: 'Delete a variable',
        inputSchema: {
            type: 'object',
            properties: {
                variableId: { type: 'string', description: 'Variable ID' },
                gtmId: { type: 'string', description: 'GTM container ID (optional, uses env default)' },
                workspaceId: {
                    type: 'string',
                    description: 'GTM workspace ID (optional, uses GTM_WORKSPACE_ID when omitted)',
                },
            },
            required: ['variableId'],
        },
    }, async ({ variableId, gtmId, workspaceId }) => {
        const manager = await getManager({ gtmId, workspaceId });
        await manager.deleteVariable(variableId);
        return textResult(`Deleted variable: ${variableId}`);
    }),
    defineTool<GtmScopedArgs>({
        name: 'gtm_list_versions',
        description: 'List container versions',
        inputSchema: {
            type: 'object',
            properties: {
                gtmId: { type: 'string', description: 'GTM container ID (optional)' },
                workspaceId: {
                    type: 'string',
                    description: 'GTM workspace ID (optional, uses GTM_WORKSPACE_ID when omitted)',
                },
            },
        },
    }, async (args) => {
        const manager = await getManager(args);
        return jsonResult(await manager.listVersions());
    }),
    defineTool<GtmScopedArgs>({
        name: 'gtm_validate_workspace',
        description: 'Validate workspace for broken references and missing variables',
        inputSchema: {
            type: 'object',
            properties: {
                gtmId: { type: 'string', description: 'GTM container ID (optional)' },
                workspaceId: {
                    type: 'string',
                    description: 'GTM workspace ID (optional, uses GTM_WORKSPACE_ID when omitted)',
                },
            },
        },
    }, async (args) => {
        const manager = await getManager(args);
        const result = await manager.validateWorkspace();
        return textResult(result.ok ? 'Workspace is valid.' : `Issues found:\n${result.issues.join('\n')}`);
    }),
    defineTool<GtmCreateGa4ConfigurationTagArgs>({
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
                        triggerType: { type: 'string', description: 'Trigger type; non-pageview types require triggerId' },
                        triggerId: { type: 'string', description: 'Existing GTM trigger ID to attach for non-pageview tags' },
                        fieldsToSet: { type: 'object' },
                    }
                },
                gtmId: { type: 'string', description: 'GTM container ID (optional, uses env default)' },
                workspaceId: {
                    type: 'string',
                    description: 'GTM workspace ID (optional, uses GTM_WORKSPACE_ID when omitted)',
                },
            },
            required: ['name', 'measurementId'],
        },
    }, async ({ name, measurementId, options, gtmId, workspaceId }) => {
        const manager = await getManager({ gtmId, workspaceId });
        const tag = await manager.createGa4ConfigurationTag(name, measurementId, options);
        return textResult(`Created GA4 Config Tag: ${tag.name} (${tag.tagId})`);
    }),
    defineTool<GtmCreateGa4EventTagArgs>({
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
                        triggerType: { type: 'string', description: 'Trigger type; non-pageview types require triggerId' },
                        triggerId: { type: 'string', description: 'Existing GTM trigger ID to attach for non-pageview tags' },
                        resolveVariables: { type: 'boolean' },
                    }
                },
                gtmId: { type: 'string', description: 'GTM container ID (optional, uses env default)' },
                workspaceId: {
                    type: 'string',
                    description: 'GTM workspace ID (optional, uses GTM_WORKSPACE_ID when omitted)',
                },
            },
            required: ['name', 'eventName'],
        },
    }, async ({ name, measurementId, eventName, options, gtmId, workspaceId }) => {
        const manager = await getManager({ gtmId, workspaceId });
        const tag = await manager.createGa4EventTag(name, measurementId, eventName, options);
        return textResult(`Created GA4 Event Tag: ${tag.name} (${tag.tagId})`);
    }),
]);

export const GTM_TOOLS = GTM_REGISTRY.tools;

export async function handleGtmTool(name: string, args: unknown) {
    return GTM_REGISTRY.dispatch(name, args);
}
