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

    async createTag(name: string, html: string, triggerType: string = 'pageview') {
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
}
