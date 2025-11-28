import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { getAuthClient } from '../auth/auth.js';

export class GTMManager {
    private auth?: OAuth2Client;
    private tagManager: any;
    private accountId?: string;
    private containerId?: string;

    constructor() {
        this.tagManager = google.tagmanager({ version: 'v2' });
    }

    async initialize() {
        this.auth = await getAuthClient();
        this.tagManager = google.tagmanager({ version: 'v2', auth: this.auth });
    }

    async findContainer(gtmId: string) {
        if (!this.auth) await this.initialize();

        try {
            const accounts = await this.tagManager.accounts.list();

            for (const account of accounts.data.account || []) {
                const containers = await this.tagManager.accounts.containers.list({
                    parent: `accounts/${account.accountId}`
                });

                const container = containers.data.container?.find(
                    (c: any) => c.publicId === gtmId
                );

                if (container) {
                    this.accountId = account.accountId;
                    this.containerId = container.containerId;
                    return { account, container };
                }
            }

            throw new Error(`Container ${gtmId} not found`);
        } catch (error: any) {
            throw new Error(`Failed to find container: ${error.message}`);
        }
    }

    async listTags() {
        if (!this.accountId || !this.containerId) {
            if (!process.env.GTM_ID) throw new Error('GTM_ID environment variable not set');
            await this.findContainer(process.env.GTM_ID);
        }

        const workspaces = await this.tagManager.accounts.containers.workspaces.list({
            parent: `accounts/${this.accountId}/containers/${this.containerId}`
        });

        const workspace = workspaces.data.workspace?.[0];
        if (!workspace) throw new Error('No workspace found');

        const tags = await this.tagManager.accounts.containers.workspaces.tags.list({
            parent: `accounts/${this.accountId}/containers/${this.containerId}/workspaces/${workspace.workspaceId}`
        });

        return tags.data.tag || [];
    }

    async listVariables() {
        if (!this.accountId || !this.containerId) {
            if (!process.env.GTM_ID) throw new Error('GTM_ID environment variable not set');
            await this.findContainer(process.env.GTM_ID);
        }

        const workspaces = await this.tagManager.accounts.containers.workspaces.list({
            parent: `accounts/${this.accountId}/containers/${this.containerId}`
        });

        const workspace = workspaces.data.workspace?.[0];
        if (!workspace) throw new Error('No workspace found');

        const variables = await this.tagManager.accounts.containers.workspaces.variables.list({
            parent: `accounts/${this.accountId}/containers/${this.containerId}/workspaces/${workspace.workspaceId}`
        });

        return variables.data.variable || [];
    }

    async listTriggers() {
        if (!this.accountId || !this.containerId) {
            if (!process.env.GTM_ID) throw new Error('GTM_ID environment variable not set');
            await this.findContainer(process.env.GTM_ID);
        }

        const workspaces = await this.tagManager.accounts.containers.workspaces.list({
            parent: `accounts/${this.accountId}/containers/${this.containerId}`
        });

        const workspace = workspaces.data.workspace?.[0];
        if (!workspace) throw new Error('No workspace found');

        const triggers = await this.tagManager.accounts.containers.workspaces.triggers.list({
            parent: `accounts/${this.accountId}/containers/${this.containerId}/workspaces/${workspace.workspaceId}`
        });

        return triggers.data.trigger || [];
    }

    async createTag(name: string, html: string, triggerType: string = 'pageview', triggerName?: string) {
        if (!this.accountId || !this.containerId) {
            if (!process.env.GTM_ID) throw new Error('GTM_ID environment variable not set');
            await this.findContainer(process.env.GTM_ID);
        }

        const workspaces = await this.tagManager.accounts.containers.workspaces.list({
            parent: `accounts/${this.accountId}/containers/${this.containerId}`
        });

        const workspace = workspaces.data.workspace?.[0];
        if (!workspace) throw new Error('No workspace found');

        // Create trigger if needed
        let triggerId;
        if (triggerType === 'pageview') {
            const triggers = await this.tagManager.accounts.containers.workspaces.triggers.list({
                parent: `accounts/${this.accountId}/containers/${this.containerId}/workspaces/${workspace.workspaceId}`
            });

            let allPagesTrigger = triggers.data.trigger?.find((t: any) => t.type === 'pageview');

            if (!allPagesTrigger) {
                const newTrigger = await this.tagManager.accounts.containers.workspaces.triggers.create({
                    parent: `accounts/${this.accountId}/containers/${this.containerId}/workspaces/${workspace.workspaceId}`,
                    requestBody: {
                        name: 'All Pages',
                        type: 'pageview'
                    }
                });
                triggerId = newTrigger.data.triggerId;
            } else {
                triggerId = allPagesTrigger.triggerId;
            }
        } else if (triggerName) {
            // Smart Trigger Resolution
            const triggers = await this.tagManager.accounts.containers.workspaces.triggers.list({
                parent: `accounts/${this.accountId}/containers/${this.containerId}/workspaces/${workspace.workspaceId}`
            });

            const existingTrigger = triggers.data.trigger?.find((t: any) => t.name === triggerName);

            if (existingTrigger) {
                triggerId = existingTrigger.triggerId;
            } else {
                const newTrigger = await this.tagManager.accounts.containers.workspaces.triggers.create({
                    parent: `accounts/${this.accountId}/containers/${this.containerId}/workspaces/${workspace.workspaceId}`,
                    requestBody: {
                        name: triggerName,
                        type: 'customEvent',
                        customEventFilter: [{
                            type: 'equals',
                            parameter: [
                                { type: 'template', key: 'arg0', value: '{{_event}}' },
                                { type: 'template', key: 'arg1', value: triggerName }
                            ]
                        }]
                    }
                });
                triggerId = newTrigger.data.triggerId;
            }
        }

        // Create tag
        const tag = await this.tagManager.accounts.containers.workspaces.tags.create({
            parent: `accounts/${this.accountId}/containers/${this.containerId}/workspaces/${workspace.workspaceId}`,
            requestBody: {
                name,
                type: 'html',
                parameter: [
                    {
                        type: 'template',
                        key: 'html',
                        value: html
                    }
                ],
                firingTriggerId: triggerId ? [triggerId] : undefined
            }
        });

        return tag.data;
    }

    async createVersion(name?: string, notes?: string) {
        if (!this.accountId || !this.containerId) {
            if (!process.env.GTM_ID) throw new Error('GTM_ID environment variable not set');
            await this.findContainer(process.env.GTM_ID);
        }

        const workspaces = await this.tagManager.accounts.containers.workspaces.list({
            parent: `accounts/${this.accountId}/containers/${this.containerId}`
        });
        const workspace = workspaces.data.workspace?.[0];
        if (!workspace) throw new Error('No workspace found');

        const resp = await this.tagManager.accounts.containers.workspaces.create_version({
            path: `accounts/${this.accountId}/containers/${this.containerId}/workspaces/${workspace.workspaceId}`,
            requestBody: {
                name,
                notes,
            },
        });

        const version = (resp as any).data?.containerVersion || (resp as any).data;
        const versionId = version?.containerVersionId;
        return { versionId, version };
    }

    async publishVersion(versionId: string) {
        if (!versionId) throw new Error('versionId is required');
        if (!this.accountId || !this.containerId) {
            if (!process.env.GTM_ID) throw new Error('GTM_ID environment variable not set');
            await this.findContainer(process.env.GTM_ID);
        }

        const resp = await this.tagManager.accounts.containers.versions.publish({
            path: `accounts/${this.accountId}/containers/${this.containerId}/versions/${versionId}`,
        });
        return resp.data;
    }
    async updateTag(tagId: string, name: string, html: string, triggerType: string = 'pageview') {
        if (!this.accountId || !this.containerId) {
            if (!process.env.GTM_ID) throw new Error('GTM_ID environment variable not set');
            await this.findContainer(process.env.GTM_ID);
        }

        const workspaces = await this.tagManager.accounts.containers.workspaces.list({
            parent: `accounts/${this.accountId}/containers/${this.containerId}`
        });

        const workspace = workspaces.data.workspace?.[0];
        if (!workspace) throw new Error('No workspace found');

        // Create trigger if needed
        let triggerId;
        if (triggerType === 'pageview') {
            const triggers = await this.tagManager.accounts.containers.workspaces.triggers.list({
                parent: `accounts/${this.accountId}/containers/${this.containerId}/workspaces/${workspace.workspaceId}`
            });

            let allPagesTrigger = triggers.data.trigger?.find((t: any) => t.type === 'pageview');

            if (!allPagesTrigger) {
                const newTrigger = await this.tagManager.accounts.containers.workspaces.triggers.create({
                    parent: `accounts/${this.accountId}/containers/${this.containerId}/workspaces/${workspace.workspaceId}`,
                    requestBody: {
                        name: 'All Pages',
                        type: 'pageview'
                    }
                });
                triggerId = newTrigger.data.triggerId;
            } else {
                triggerId = allPagesTrigger.triggerId;
            }
        }

        const tag = await this.tagManager.accounts.containers.workspaces.tags.update({
            path: `accounts/${this.accountId}/containers/${this.containerId}/workspaces/${workspace.workspaceId}/tags/${tagId}`,
            requestBody: {
                name,
                type: 'html',
                parameter: [
                    {
                        type: 'template',
                        key: 'html',
                        value: html
                    }
                ],
                firingTriggerId: triggerId ? [triggerId] : undefined
            }
        });

        return tag.data;
    }

    async deleteTag(tagId: string) {
        if (!this.accountId || !this.containerId) {
            if (!process.env.GTM_ID) throw new Error('GTM_ID environment variable not set');
            await this.findContainer(process.env.GTM_ID);
        }

        const workspaces = await this.tagManager.accounts.containers.workspaces.list({
            parent: `accounts/${this.accountId}/containers/${this.containerId}`
        });

        const workspace = workspaces.data.workspace?.[0];
        if (!workspace) throw new Error('No workspace found');

        await this.tagManager.accounts.containers.workspaces.tags.delete({
            path: `accounts/${this.accountId}/containers/${this.containerId}/workspaces/${workspace.workspaceId}/tags/${tagId}`
        });

        return { success: true, message: `Tag ${tagId} deleted` };
    }


    async listAccounts() {
        if (!this.auth) await this.initialize();
        const accounts = await this.tagManager.accounts.list();
        return accounts.data.account || [];
    }

    async listContainers(accountId?: string) {
        if (!this.auth) await this.initialize();

        if (accountId) {
            const containers = await this.tagManager.accounts.containers.list({
                parent: `accounts/${accountId}`
            });
            return containers.data.container || [];
        }

        // If no accountId, list all containers from all accounts
        const accounts = await this.listAccounts();
        let allContainers: any[] = [];
        for (const account of accounts) {
            const containers = await this.tagManager.accounts.containers.list({
                parent: `accounts/${account.accountId}`
            });
            if (containers.data.container) {
                allContainers = allContainers.concat(containers.data.container);
            }
        }
        return allContainers;
    }

    async listWorkspaces() {
        if (!this.accountId || !this.containerId) {
            if (!process.env.GTM_ID) throw new Error('GTM_ID environment variable not set');
            await this.findContainer(process.env.GTM_ID);
        }

        const workspaces = await this.tagManager.accounts.containers.workspaces.list({
            parent: `accounts/${this.accountId}/containers/${this.containerId}`
        });
        return workspaces.data.workspace || [];
    }

    async createTrigger(name: string, type: string, filters: any[] = []) {
        if (!this.accountId || !this.containerId) {
            if (!process.env.GTM_ID) throw new Error('GTM_ID environment variable not set');
            await this.findContainer(process.env.GTM_ID);
        }

        const workspaces = await this.tagManager.accounts.containers.workspaces.list({
            parent: `accounts/${this.accountId}/containers/${this.containerId}`
        });
        const workspace = workspaces.data.workspace?.[0];
        if (!workspace) throw new Error('No workspace found');

        const trigger = await this.tagManager.accounts.containers.workspaces.triggers.create({
            parent: `accounts/${this.accountId}/containers/${this.containerId}/workspaces/${workspace.workspaceId}`,
            requestBody: {
                name,
                type,
                filter: filters
            }
        });
        return trigger.data;
    }

    async createVariable(name: string, type: string, parameters: any[] = []) {
        if (!this.accountId || !this.containerId) {
            if (!process.env.GTM_ID) throw new Error('GTM_ID environment variable not set');
            await this.findContainer(process.env.GTM_ID);
        }

        const workspaces = await this.tagManager.accounts.containers.workspaces.list({
            parent: `accounts/${this.accountId}/containers/${this.containerId}`
        });
        const workspace = workspaces.data.workspace?.[0];
        if (!workspace) throw new Error('No workspace found');

        const variable = await this.tagManager.accounts.containers.workspaces.variables.create({
            parent: `accounts/${this.accountId}/containers/${this.containerId}/workspaces/${workspace.workspaceId}`,
            requestBody: {
                name,
                type,
                parameter: parameters
            }
        });
        return variable.data;
    }

    async deleteVariable(variableId: string) {
        if (!this.accountId || !this.containerId) {
            if (!process.env.GTM_ID) throw new Error('GTM_ID environment variable not set');
            await this.findContainer(process.env.GTM_ID);
        }

        const workspaces = await this.tagManager.accounts.containers.workspaces.list({
            parent: `accounts/${this.accountId}/containers/${this.containerId}`
        });
        const workspace = workspaces.data.workspace?.[0];
        if (!workspace) throw new Error('No workspace found');

        await this.tagManager.accounts.containers.workspaces.variables.delete({
            path: `accounts/${this.accountId}/containers/${this.containerId}/workspaces/${workspace.workspaceId}/variables/${variableId}`
        });
        return { success: true, variableId };
    }

    async listVersions() {
        if (!this.accountId || !this.containerId) {
            if (!process.env.GTM_ID) throw new Error('GTM_ID environment variable not set');
            await this.findContainer(process.env.GTM_ID);
        }

        const versions = await this.tagManager.accounts.containers.version_headers.list({
            parent: `accounts/${this.accountId}/containers/${this.containerId}`
        });
        return versions.data.containerVersionHeader || [];
    }

    async validateWorkspace() {
        if (!this.accountId || !this.containerId) {
            if (!process.env.GTM_ID) throw new Error('GTM_ID environment variable not set');
            await this.findContainer(process.env.GTM_ID);
        }
        const [tags, variables, triggers] = await Promise.all([
            this.listTags(),
            this.listVariables(),
            this.listTriggers(),
        ]);
        const varNames = new Set((variables || []).map((v: any) => String(v.name || '')));
        const triggerIds = new Set((triggers || []).map((t: any) => String(t.triggerId || '')));
        const issues: string[] = [];

        for (const tag of (tags as any[])) {
            const p = (tag.parameter || []) as any[];
            if (Array.isArray(tag.firingTriggerId)) {
                for (const tid of tag.firingTriggerId) {
                    if (tid && !triggerIds.has(String(tid))) issues.push(`Tag '${tag.name}' references missing trigger ${tid}`);
                }
            }
            if (tag.type === 'gaawe') {
                const hasSendTo = p.some((x) => x.key === 'sendToTag');
                const hasMid = p.some((x) => x.key === 'measurementId');
                const hasMidOverride = p.some((x) => x.key === 'measurementIdOverride');
                if (!hasSendTo && !hasMid && !hasMidOverride) {
                    issues.push(`GA4 Event '${tag.name}' missing configTagId/measurementId`);
                }
            }
            const evp = p.find((x) => x.key === 'eventParameters');
            if (evp && Array.isArray(evp.list)) {
                for (const m of evp.list as any[]) {
                    const valueEntry = (m.map || []).find((e: any) => e.key === 'value');
                    const val = valueEntry?.value as string | undefined;
                    const macro = val && /\{\{([^}]+)\}\}/.exec(val);
                    if (macro && !varNames.has(macro[1])) {
                        issues.push(`Tag '${tag.name}' references unknown variable '{{${macro[1]}}}'`);
                    }
                }
            }
        }

        return { ok: issues.length === 0, issues };
    }

    async createGa4ConfigurationTag(
        name: string,
        measurementId: string,
        options?: { sendPageView?: boolean; triggerType?: string; fieldsToSet?: Record<string, string> }
    ) {
        if (!this.accountId || !this.containerId) {
            if (!process.env.GTM_ID) throw new Error('GTM_ID environment variable not set');
            await this.findContainer(process.env.GTM_ID);
        }

        const workspaces = await this.tagManager.accounts.containers.workspaces.list({
            parent: `accounts/${this.accountId}/containers/${this.containerId}`
        });
        const workspace = workspaces.data.workspace?.[0];
        if (!workspace) throw new Error('No workspace found');

        let triggerId: string | undefined = (options as any)?.triggerId;
        const triggerType = options?.triggerType || 'pageview';
        if (!triggerId && triggerType === 'pageview') {
            const triggers = await this.tagManager.accounts.containers.workspaces.triggers.list({
                parent: `accounts/${this.accountId}/containers/${this.containerId}/workspaces/${workspace.workspaceId}`,
            });
            let allPagesTrigger = triggers.data.trigger?.find((t: any) => t.type === 'pageview');
            if (!allPagesTrigger) {
                const newTrigger = await this.tagManager.accounts.containers.workspaces.triggers.create({
                    parent: `accounts/${this.accountId}/containers/${this.containerId}/workspaces/${workspace.workspaceId}`,
                    requestBody: { name: 'All Pages', type: 'pageview' },
                });
                triggerId = newTrigger.data.triggerId as string;
            } else {
                triggerId = allPagesTrigger.triggerId as string;
            }
        }

        const params: any[] = [
            { type: 'template', key: 'measurementId', value: measurementId },
        ];
        if (typeof options?.sendPageView === 'boolean') {
            params.push({ type: 'boolean', key: 'sendPageView', value: options.sendPageView ? 'true' : 'false' });
        }
        if (options?.fieldsToSet && Object.keys(options.fieldsToSet).length > 0) {
            params.push({
                type: 'list',
                key: 'fieldsToSet',
                list: Object.entries(options.fieldsToSet).map(([k, v]) => ({
                    type: 'map',
                    map: [
                        { type: 'template', key: 'name', value: k },
                        { type: 'template', key: 'value', value: String(v) },
                    ],
                })),
            });
        }

        const tag = await this.tagManager.accounts.containers.workspaces.tags.create({
            parent: `accounts/${this.accountId}/containers/${this.containerId}/workspaces/${workspace.workspaceId}`,
            requestBody: {
                name,
                type: 'gaawc',
                parameter: params,
                firingTriggerId: triggerId ? [triggerId] : undefined,
            },
        });

        return tag.data;
    }

    async createGa4EventTag(
        name: string,
        measurementId: string | undefined,
        eventName: string,
        options?: { configTagId?: string; eventParameters?: Record<string, any>; triggerType?: string; triggerId?: string; resolveVariables?: boolean }
    ) {
        if (!this.accountId || !this.containerId) {
            if (!process.env.GTM_ID) throw new Error('GTM_ID environment variable not set');
            await this.findContainer(process.env.GTM_ID);
        }

        const workspaces = await this.tagManager.accounts.containers.workspaces.list({
            parent: `accounts/${this.accountId}/containers/${this.containerId}`
        });
        const workspace = workspaces.data.workspace?.[0];
        if (!workspace) throw new Error('No workspace found');

        let triggerId: string | undefined = options?.triggerId;
        const triggerType = options?.triggerType || 'pageview';
        if (!triggerId && triggerType === 'pageview') {
            const triggers = await this.tagManager.accounts.containers.workspaces.triggers.list({
                parent: `accounts/${this.accountId}/containers/${this.containerId}/workspaces/${workspace.workspaceId}`,
            });
            let allPagesTrigger = triggers.data.trigger?.find((t: any) => t.type === 'pageview');
            if (!allPagesTrigger) {
                const newTrigger = await this.tagManager.accounts.containers.workspaces.triggers.create({
                    parent: `accounts/${this.accountId}/containers/${this.containerId}/workspaces/${workspace.workspaceId}`,
                    requestBody: { name: 'All Pages', type: 'pageview' },
                });
                triggerId = newTrigger.data.triggerId as string;
            } else {
                triggerId = allPagesTrigger.triggerId as string;
            }
        }

        const params: any[] = [
            { type: 'template', key: 'eventName', value: eventName },
        ];
        if (options?.configTagId) {
            params.push({ type: 'tagReference', key: 'sendToTag', value: options.configTagId });
        } else if (measurementId) {
            params.push({ type: 'template', key: 'measurementId', value: measurementId });
            params.push({
                type: 'list',
                key: 'measurementIdOverride',
                list: [{ type: 'template', value: measurementId }],
            });
        } else {
            throw new Error('Either configTagId or measurementId is required');
        }
        if (options?.eventParameters && Object.keys(options.eventParameters).length > 0) {
            const variables = options.resolveVariables ? await this.listVariables() : [];
            const varById = new Map<string, any>();
            const varByName = new Map<string, any>();
            for (const v of variables as any[]) {
                if (v.variableId) varById.set(String(v.variableId), v);
                if (v.name) varByName.set(String(v.name), v);
            }
            const list = Object.entries(options.eventParameters).map(([k, spec]) => {
                let valueStr: string;
                if (spec && typeof spec === 'object' && !Array.isArray(spec)) {
                    if ('value' in spec) {
                        valueStr = String((spec as any).value);
                    } else if ('varId' in spec) {
                        const vv = varById.get(String((spec as any).varId));
                        valueStr = vv ? `{{${vv.name}}}` : `{{${(spec as any).varId}}}`;
                    } else if ('var' in spec) {
                        const vv = varByName.get(String((spec as any).var));
                        valueStr = vv ? `{{${vv.name}}}` : `{{${(spec as any).var}}}`;
                    } else {
                        valueStr = String(spec as any);
                    }
                } else {
                    valueStr = String(spec as any);
                }
                return {
                    type: 'map',
                    map: [
                        { type: 'template', key: 'name', value: k },
                        { type: 'template', key: 'value', value: valueStr },
                    ],
                };
            });
            params.push({ type: 'list', key: 'eventParameters', list });
        }

        const tag = await this.tagManager.accounts.containers.workspaces.tags.create({
            parent: `accounts/${this.accountId}/containers/${this.containerId}/workspaces/${workspace.workspaceId}`,
            requestBody: {
                name,
                type: 'gaawe',
                parameter: params,
                firingTriggerId: triggerId ? [triggerId] : undefined,
            },
        });

        return tag.data;
    }
}
