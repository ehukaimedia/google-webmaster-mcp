import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { getAuthClient } from '../auth/auth.js';
import {
    buildCustomEventFilter,
    buildGa4ConfigurationParameters,
    buildGa4EventParameters,
    buildHtmlParameters,
    validateWorkspaceAssets,
} from './helpers.js';
import type {
    GtmAccount,
    GtmBuiltInVariable,
    GtmCondition,
    GtmContainer,
    GtmContainerSelection,
    GtmContainerVersion,
    GtmContainerVersionHeader,
    GtmCreateBuiltInVariableResponse,
    GtmGa4ConfigurationOptions,
    GtmGa4EventOptions,
    GtmTag,
    GtmTagManager,
    GtmTrigger,
    GtmVariable,
    GtmWorkspace,
    GtmWorkspaceContext,
    GtmWorkspaceValidationResult,
} from './types.js';

const ALL_PAGES_TRIGGER_NAME = 'All Pages';

function requireId(value: string | null | undefined, label: string): string {
    if (!value) {
        throw new Error(`${label} missing from GTM response`);
    }
    return value;
}

function isAllPagesTrigger(trigger: GtmTrigger): boolean {
    return (
        trigger.type === 'pageview' &&
        (!trigger.filter || trigger.filter.length === 0) &&
        (!trigger.autoEventFilter || trigger.autoEventFilter.length === 0) &&
        (!trigger.customEventFilter || trigger.customEventFilter.length === 0)
    );
}

export class GTMManager {
    private auth?: OAuth2Client;
    private tagManager: GtmTagManager;
    private selection?: GtmContainerSelection;
    private readonly workspaceOverride?: string;

    constructor(workspaceId?: string) {
        this.workspaceOverride = workspaceId;
        this.tagManager = google.tagmanager({ version: 'v2' });
    }

    async initialize(): Promise<void> {
        this.auth = await getAuthClient();
        this.tagManager = google.tagmanager({ version: 'v2', auth: this.auth });
    }

    selectContainer(accountId: string, containerId: string): void {
        this.selection = { accountId, containerId };
    }

    async findContainer(gtmId: string): Promise<{ account: GtmAccount; container: GtmContainer; }> {
        await this.ensureInitialized();

        try {
            const accounts = await this.listAccounts();

            for (const account of accounts) {
                const accountId = account.accountId;
                if (!accountId) {
                    continue;
                }

                const containers = await this.tagManager.accounts.containers.list({
                    parent: this.accountParent(accountId),
                });

                const container = (containers.data.container || []).find((candidate) => candidate.publicId === gtmId);
                if (container?.containerId) {
                    this.selection = {
                        accountId,
                        containerId: container.containerId,
                    };

                    return { account, container };
                }
            }

            throw new Error(`Container ${gtmId} not found`);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to find container: ${message}`);
        }
    }

    async listTags(): Promise<GtmTag[]> {
        return this.listTagsForWorkspace(await this.getWorkspaceContext());
    }

    async listVariables(): Promise<GtmVariable[]> {
        return this.listVariablesForWorkspace(await this.getWorkspaceContext());
    }

    async listTriggers(): Promise<GtmTrigger[]> {
        return this.listTriggersForWorkspace(await this.getWorkspaceContext());
    }

    async createTag(name: string, html: string, triggerType: string = 'pageview', triggerName?: string): Promise<GtmTag> {
        const workspace = await this.getWorkspaceContext();
        const triggerId = await this.resolveTriggerId(workspace, triggerType, triggerName);

        const response = await this.tagManager.accounts.containers.workspaces.tags.create({
            parent: this.workspaceParent(workspace),
            requestBody: {
                name,
                type: 'html',
                parameter: buildHtmlParameters(html),
                firingTriggerId: triggerId ? [triggerId] : undefined,
            },
        });

        return response.data;
    }

    async createVersion(name?: string, notes?: string): Promise<{ versionId?: string; version?: GtmContainerVersion; }> {
        const workspace = await this.getWorkspaceContext();
        const response = await this.tagManager.accounts.containers.workspaces.create_version({
            path: this.workspaceParent(workspace),
            requestBody: { name, notes },
        });

        const version = response.data.containerVersion || undefined;
        return {
            versionId: version?.containerVersionId || undefined,
            version,
        };
    }

    async publishVersion(versionId: string): Promise<GtmContainerVersion | unknown> {
        if (!versionId) {
            throw new Error('versionId is required');
        }

        const selection = await this.ensureSelection();
        const response = await this.tagManager.accounts.containers.versions.publish({
            path: this.versionPath(selection, versionId),
        });

        return response.data;
    }

    async updateTag(tagId: string, name: string, html: string, triggerType?: string, triggerName?: string): Promise<GtmTag> {
        const workspace = await this.getWorkspaceContext();
        const existingTag = await this.getTagForWorkspace(workspace, tagId);
        const firingTriggerId = await this.resolveUpdatedTagTriggers(workspace, existingTag, triggerType, triggerName);

        const response = await this.tagManager.accounts.containers.workspaces.tags.update({
            path: this.tagPath(workspace, tagId),
            requestBody: {
                name,
                type: 'html',
                parameter: buildHtmlParameters(html),
                firingTriggerId,
            },
        });

        return response.data;
    }

    async deleteTag(tagId: string): Promise<{ success: true; message: string; }> {
        const workspace = await this.getWorkspaceContext();

        await this.tagManager.accounts.containers.workspaces.tags.delete({
            path: this.tagPath(workspace, tagId),
        });

        return { success: true, message: `Tag ${tagId} deleted` };
    }

    async listAccounts(): Promise<GtmAccount[]> {
        await this.ensureInitialized();
        const response = await this.tagManager.accounts.list();
        return response.data.account || [];
    }

    async listContainers(accountId?: string): Promise<GtmContainer[]> {
        await this.ensureInitialized();

        if (accountId) {
            const response = await this.tagManager.accounts.containers.list({
                parent: this.accountParent(accountId),
            });
            return response.data.container || [];
        }

        const allContainers: GtmContainer[] = [];
        for (const account of await this.listAccounts()) {
            if (!account.accountId) {
                continue;
            }

            const response = await this.tagManager.accounts.containers.list({
                parent: this.accountParent(account.accountId),
            });

            allContainers.push(...(response.data.container || []));
        }

        return allContainers;
    }

    async listWorkspaces(): Promise<GtmWorkspace[]> {
        const selection = await this.ensureSelection();
        return this.listWorkspacesForContainer(selection);
    }

    async createTrigger(name: string, type: string, filters: GtmCondition[] = []): Promise<GtmTrigger> {
        const workspace = await this.getWorkspaceContext();
        const response = await this.tagManager.accounts.containers.workspaces.triggers.create({
            parent: this.workspaceParent(workspace),
            requestBody: {
                name,
                type,
                filter: type === 'customEvent' ? undefined : filters,
                customEventFilter: type === 'customEvent' ? filters : undefined,
            },
        });

        return response.data;
    }

    async createVariable(name: string, type: string, parameters: GtmVariable['parameter'] = []): Promise<GtmVariable> {
        const workspace = await this.getWorkspaceContext();
        const response = await this.tagManager.accounts.containers.workspaces.variables.create({
            parent: this.workspaceParent(workspace),
            requestBody: {
                name,
                type,
                parameter: parameters,
            },
        });

        return response.data;
    }

    async enableBuiltInVariable(type: string): Promise<GtmCreateBuiltInVariableResponse | { name: string; type: string; enabled: true; status: 'already_enabled'; }> {
        const workspace = await this.getWorkspaceContext();
        const existing = await this.listBuiltInVariablesForWorkspace(workspace);

        if (existing.some((variable) => variable.type === type)) {
            return { name: type, type, enabled: true, status: 'already_enabled' };
        }

        const response = await this.tagManager.accounts.containers.workspaces.built_in_variables.create({
            parent: this.workspaceParent(workspace),
            type: [type],
        });

        return response.data;
    }

    async listBuiltInVariables(): Promise<GtmBuiltInVariable[]> {
        return this.listBuiltInVariablesForWorkspace(await this.getWorkspaceContext());
    }

    async deleteVariable(variableId: string): Promise<{ success: true; variableId: string; }> {
        const workspace = await this.getWorkspaceContext();

        await this.tagManager.accounts.containers.workspaces.variables.delete({
            path: this.variablePath(workspace, variableId),
        });

        return { success: true, variableId };
    }

    async listVersions(): Promise<GtmContainerVersionHeader[]> {
        const selection = await this.ensureSelection();
        const response = await this.tagManager.accounts.containers.version_headers.list({
            parent: this.containerParent(selection),
        });

        return response.data.containerVersionHeader || [];
    }

    async validateWorkspace(): Promise<GtmWorkspaceValidationResult> {
        const [tags, variables, triggers, builtInVariables] = await Promise.all([
            this.listTags(),
            this.listVariables(),
            this.listTriggers(),
            this.listBuiltInVariables(),
        ]);

        return validateWorkspaceAssets(tags, variables, triggers, builtInVariables);
    }

    async createGa4ConfigurationTag(
        name: string,
        measurementId: string,
        options?: GtmGa4ConfigurationOptions
    ): Promise<GtmTag> {
        const workspace = await this.getWorkspaceContext();
        const triggerId = await this.resolveConfiguredTriggerId(workspace, options);
        const response = await this.tagManager.accounts.containers.workspaces.tags.create({
            parent: this.workspaceParent(workspace),
            requestBody: {
                name,
                type: 'gaawc',
                parameter: buildGa4ConfigurationParameters(measurementId, options),
                firingTriggerId: triggerId ? [triggerId] : undefined,
            },
        });

        return response.data;
    }

    async createGa4EventTag(
        name: string,
        measurementId: string | undefined,
        eventName: string,
        options?: GtmGa4EventOptions
    ): Promise<GtmTag> {
        const workspace = await this.getWorkspaceContext();
        const triggerId = await this.resolveConfiguredTriggerId(workspace, options);
        const variables = options?.resolveVariables ? await this.listVariablesForWorkspace(workspace) : [];
        const response = await this.tagManager.accounts.containers.workspaces.tags.create({
            parent: this.workspaceParent(workspace),
            requestBody: {
                name,
                type: 'gaawe',
                parameter: buildGa4EventParameters(measurementId, eventName, options, variables),
                firingTriggerId: triggerId ? [triggerId] : undefined,
            },
        });

        return response.data;
    }

    private async ensureInitialized(): Promise<void> {
        if (!this.auth) {
            await this.initialize();
        }
    }

    private async ensureSelection(): Promise<GtmContainerSelection> {
        if (!this.selection) {
            const gtmId = process.env.GTM_ID;
            if (!gtmId) {
                throw new Error('GTM_ID environment variable not set');
            }

            await this.findContainer(gtmId);
        }

        if (!this.selection) {
            throw new Error('No GTM container selected');
        }

        return this.selection;
    }

    private async getWorkspaceContext(): Promise<GtmWorkspaceContext> {
        const selection = await this.ensureSelection();
        const workspaces = await this.listWorkspacesForContainer(selection);
        const workspaceSelector = this.workspaceOverride || process.env.GTM_WORKSPACE_ID;

        if (workspaceSelector) {
            const selectedWorkspace = workspaces.find((workspace) => workspace.workspaceId === workspaceSelector);
            if (!selectedWorkspace?.workspaceId) {
                throw new Error(`Workspace ${workspaceSelector} not found for the selected GTM container`);
            }

            return { ...selection, workspaceId: selectedWorkspace.workspaceId };
        }

        if (workspaces.length === 1) {
            return { ...selection, workspaceId: requireId(workspaces[0]?.workspaceId, 'Workspace ID') };
        }

        if (workspaces.length === 0) {
            throw new Error('No GTM workspace found');
        }

        throw new Error('Multiple GTM workspaces found; set GTM_WORKSPACE_ID to select one explicitly');
    }

    private async listWorkspacesForContainer(selection: GtmContainerSelection): Promise<GtmWorkspace[]> {
        const response = await this.tagManager.accounts.containers.workspaces.list({
            parent: this.containerParent(selection),
        });

        return response.data.workspace || [];
    }

    private async listTagsForWorkspace(workspace: GtmWorkspaceContext): Promise<GtmTag[]> {
        const response = await this.tagManager.accounts.containers.workspaces.tags.list({
            parent: this.workspaceParent(workspace),
        });

        return response.data.tag || [];
    }

    private async getTagForWorkspace(workspace: GtmWorkspaceContext, tagId: string): Promise<GtmTag> {
        const tag = (await this.listTagsForWorkspace(workspace)).find((candidate) => candidate.tagId === tagId);
        if (!tag) {
            throw new Error(`Tag ${tagId} not found`);
        }

        return tag;
    }

    private async listVariablesForWorkspace(workspace: GtmWorkspaceContext): Promise<GtmVariable[]> {
        const response = await this.tagManager.accounts.containers.workspaces.variables.list({
            parent: this.workspaceParent(workspace),
        });

        return response.data.variable || [];
    }

    private async listTriggersForWorkspace(workspace: GtmWorkspaceContext): Promise<GtmTrigger[]> {
        const response = await this.tagManager.accounts.containers.workspaces.triggers.list({
            parent: this.workspaceParent(workspace),
        });

        return response.data.trigger || [];
    }

    private async listBuiltInVariablesForWorkspace(workspace: GtmWorkspaceContext): Promise<GtmBuiltInVariable[]> {
        const response = await this.tagManager.accounts.containers.workspaces.built_in_variables.list({
            parent: this.workspaceParent(workspace),
        });

        return response.data.builtInVariable || [];
    }

    private async resolveConfiguredTriggerId(
        workspace: GtmWorkspaceContext,
        options?: Pick<GtmGa4ConfigurationOptions, 'triggerId' | 'triggerType'> | Pick<GtmGa4EventOptions, 'triggerId' | 'triggerType'>
    ): Promise<string | undefined> {
        if (options && 'triggerId' in options && !options.triggerId) {
            throw new Error('GA4 tags require a non-empty triggerId when triggerId is provided');
        }

        if (options?.triggerId) {
            return options.triggerId;
        }

        const triggerType = options?.triggerType || 'pageview';
        if (triggerType === 'pageview') {
            return this.ensurePageviewTrigger(workspace);
        }

        throw new Error('Non-pageview GA4 tags require an explicit triggerId');
    }

    private async resolveTriggerId(
        workspace: GtmWorkspaceContext,
        triggerType: string = 'pageview',
        triggerName?: string
    ): Promise<string | undefined> {
        if (triggerType === 'pageview') {
            return this.ensurePageviewTrigger(workspace);
        }

        if (!triggerName) {
            throw new Error('triggerName is required when creating a non-pageview trigger');
        }

        const triggers = await this.listTriggersForWorkspace(workspace);
        const existingTrigger = triggers.find((trigger) => trigger.name === triggerName);
        if (existingTrigger?.triggerId) {
            if (existingTrigger.type !== triggerType) {
                throw new Error(
                    `Trigger ${triggerName} already exists with type ${existingTrigger.type}; expected ${triggerType}`
                );
            }
            return existingTrigger.triggerId;
        }

        const response = await this.tagManager.accounts.containers.workspaces.triggers.create({
            parent: this.workspaceParent(workspace),
            requestBody: {
                name: triggerName,
                type: triggerType,
                customEventFilter: triggerType === 'customEvent' ? buildCustomEventFilter(triggerName) : undefined,
            },
        });

        return requireId(response.data.triggerId, 'Trigger ID');
    }

    private async resolveUpdatedTagTriggers(
        workspace: GtmWorkspaceContext,
        existingTag: GtmTag,
        triggerType?: string,
        triggerName?: string
    ): Promise<string[] | undefined> {
        if (!triggerType) {
            return existingTag.firingTriggerId || undefined;
        }

        if (triggerType !== 'pageview' && !triggerName) {
            throw new Error('triggerName is required when changing a tag to a non-pageview trigger');
        }

        const triggerId = await this.resolveTriggerId(workspace, triggerType, triggerName);
        return triggerId ? [triggerId] : undefined;
    }

    private async ensurePageviewTrigger(workspace: GtmWorkspaceContext): Promise<string> {
        const triggers = await this.listTriggersForWorkspace(workspace);
        const existingTrigger = triggers.find((trigger) => isAllPagesTrigger(trigger) && trigger.triggerId);
        if (existingTrigger?.triggerId) {
            return existingTrigger.triggerId;
        }

        const response = await this.tagManager.accounts.containers.workspaces.triggers.create({
            parent: this.workspaceParent(workspace),
            requestBody: {
                name: ALL_PAGES_TRIGGER_NAME,
                type: 'pageview',
            },
        });

        return requireId(response.data.triggerId, 'Trigger ID');
    }

    private accountParent(accountId: string): string {
        return `accounts/${accountId}`;
    }

    private containerParent(selection: GtmContainerSelection): string {
        return `${this.accountParent(selection.accountId)}/containers/${selection.containerId}`;
    }

    private workspaceParent(workspace: GtmWorkspaceContext): string {
        return `${this.containerParent(workspace)}/workspaces/${workspace.workspaceId}`;
    }

    private tagPath(workspace: GtmWorkspaceContext, tagId: string): string {
        return `${this.workspaceParent(workspace)}/tags/${tagId}`;
    }

    private variablePath(workspace: GtmWorkspaceContext, variableId: string): string {
        return `${this.workspaceParent(workspace)}/variables/${variableId}`;
    }

    private versionPath(selection: GtmContainerSelection, versionId: string): string {
        return `${this.containerParent(selection)}/versions/${versionId}`;
    }
}
