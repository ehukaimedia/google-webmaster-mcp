import assert from 'node:assert/strict';
import test from 'node:test';
import { GTMManager } from '../dist/gtm/client.js';

function createManagerHarness() {
    const manager = new GTMManager('workspace-1');
    let updateRequestBody;
    let createdTriggerRequestBody;
    let createdTagRequestBody;

    manager.selectContainer('account-1', 'container-1');
    manager.tagManager = {
        accounts: {
            containers: {
                workspaces: {
                    list: async () => ({
                        data: {
                            workspace: [{ workspaceId: 'workspace-1' }],
                        },
                    }),
                    tags: {
                        list: async () => ({
                            data: {
                                tag: [{ tagId: 'tag-1', firingTriggerId: ['trigger-42'] }],
                            },
                        }),
                        create: async ({ requestBody }) => {
                            createdTagRequestBody = requestBody;
                            return {
                                data: {
                                    tagId: 'tag-created',
                                    ...requestBody,
                                },
                            };
                        },
                        update: async ({ requestBody }) => {
                            updateRequestBody = requestBody;
                            return {
                                data: {
                                    tagId: 'tag-1',
                                    ...requestBody,
                                },
                            };
                        },
                    },
                    triggers: {
                        list: async () => ({ data: { trigger: [] } }),
                        create: async ({ requestBody }) => {
                            createdTriggerRequestBody = requestBody;
                            return {
                                data: {
                                    triggerId: 'trigger-created',
                                    ...requestBody,
                                },
                            };
                        },
                    },
                },
            },
        },
    };

    return {
        manager,
        getUpdateRequestBody: () => updateRequestBody,
        getCreatedTriggerRequestBody: () => createdTriggerRequestBody,
        getCreatedTagRequestBody: () => createdTagRequestBody,
    };
}

test('updateTag preserves existing firing triggers when no new trigger is provided', async () => {
    const { manager, getUpdateRequestBody } = createManagerHarness();

    const updatedTag = await manager.updateTag('tag-1', 'Updated Tag', '<script>console.log(1)</script>');

    assert.equal(updatedTag.name, 'Updated Tag');
    assert.deepEqual(getUpdateRequestBody().firingTriggerId, ['trigger-42']);
});

test('updateTag requires triggerName when changing to a non-pageview trigger', async () => {
    const { manager } = createManagerHarness();

    await assert.rejects(
        manager.updateTag('tag-1', 'Updated Tag', '<script>console.log(1)</script>', 'customEvent'),
        /triggerName is required/,
    );
});

test('createTag honors the requested non-pageview trigger type when creating a trigger', async () => {
    const { manager, getCreatedTriggerRequestBody, getCreatedTagRequestBody } = createManagerHarness();

    const createdTag = await manager.createTag(
        'Click Tag',
        '<script>console.log(1)</script>',
        'linkClick',
        'CTA Click'
    );

    assert.equal(createdTag.name, 'Click Tag');
    assert.equal(getCreatedTriggerRequestBody().type, 'linkClick');
    assert.equal(getCreatedTriggerRequestBody().customEventFilter, undefined);
    assert.deepEqual(getCreatedTagRequestBody().firingTriggerId, ['trigger-created']);
});

test('createTag rejects non-pageview tags that omit triggerName', async () => {
    const { manager } = createManagerHarness();

    await assert.rejects(
        manager.createTag('Broken Tag', '<script>console.log(1)</script>', 'linkClick'),
        /triggerName is required/,
    );
});

test('createGa4ConfigurationTag rejects non-pageview triggerType without triggerId', async () => {
    const { manager } = createManagerHarness();

    await assert.rejects(
        manager.createGa4ConfigurationTag('GA4 Config', 'G-TEST123', { triggerType: 'linkClick' }),
        /explicit triggerId/,
    );
});

test('createGa4EventTag rejects non-pageview triggerType without triggerId', async () => {
    const { manager } = createManagerHarness();

    await assert.rejects(
        manager.createGa4EventTag('GA4 Event', 'G-TEST123', 'cta_click', { triggerType: 'linkClick' }),
        /explicit triggerId/,
    );
});

test('createGa4ConfigurationTag reuses renamed universal pageview triggers', async () => {
    const { manager, getCreatedTriggerRequestBody, getCreatedTagRequestBody } = createManagerHarness();

    manager.tagManager.accounts.containers.workspaces.triggers.list = async () => ({
        data: {
            trigger: [{
                triggerId: 'renamed-pageview',
                name: 'Todas las paginas',
                type: 'pageview',
            }],
        },
    });

    const tag = await manager.createGa4ConfigurationTag('GA4 Config', 'G-TEST123', {
        triggerType: 'pageview',
        sendPageView: true,
    });

    assert.equal(tag.name, 'GA4 Config');
    assert.equal(getCreatedTriggerRequestBody(), undefined);
    assert.deepEqual(getCreatedTagRequestBody().firingTriggerId, ['renamed-pageview']);
});
