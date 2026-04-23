import assert from 'node:assert/strict';
import test from 'node:test';
import { setupGa4Defaults } from '../dist/gtm/setup.js';

test('setupGa4Defaults rejects a drifted GA4 configuration tag instead of silently reusing it', async () => {
    const fakeManager = {
        async listTags() {
            return [{
                name: 'GA4 Configuration',
                type: 'gaawc',
                parameter: [
                    { type: 'template', key: 'measurementId', value: 'G-WRONG' },
                    { type: 'boolean', key: 'sendPageView', value: 'true' },
                ],
                firingTriggerId: ['1'],
            }];
        },
        async listTriggers() {
            return [{ name: 'All Pages', type: 'pageview', triggerId: '1' }];
        },
        async enableBuiltInVariable() {
            return { name: 'clickUrl', type: 'clickUrl', enabled: true, status: 'already_enabled' };
        },
    };

    await assert.rejects(
        () => setupGa4Defaults(fakeManager, 'G-EXPECTED'),
        /does not match the expected GA4 configuration/,
    );
});

test('setupGa4Defaults rejects a reused GA4 configuration tag with extra firing triggers', async () => {
    const fakeManager = {
        async listTags() {
            return [{
                name: 'GA4 Configuration',
                type: 'gaawc',
                parameter: [
                    { type: 'template', key: 'measurementId', value: 'G-EXPECTED' },
                    { type: 'boolean', key: 'sendPageView', value: 'true' },
                ],
                firingTriggerId: ['1', '2'],
            }];
        },
        async listTriggers() {
            return [
                { name: 'All Pages', type: 'pageview', triggerId: '1' },
                { name: 'Extra Pages', type: 'pageview', triggerId: '2' },
            ];
        },
        async enableBuiltInVariable() {
            return { name: 'clickUrl', type: 'clickUrl', enabled: true, status: 'already_enabled' };
        },
    };

    await assert.rejects(
        () => setupGa4Defaults(fakeManager, 'G-EXPECTED'),
        /not attached to a pageview trigger/,
    );
});

test('setupGa4Defaults rejects a GA4 configuration tag attached to a filtered pageview trigger', async () => {
    const fakeManager = {
        async listTags() {
            return [{
                name: 'GA4 Configuration',
                type: 'gaawc',
                parameter: [
                    { type: 'template', key: 'measurementId', value: 'G-EXPECTED' },
                    { type: 'boolean', key: 'sendPageView', value: 'true' },
                ],
                firingTriggerId: ['2'],
            }];
        },
        async listTriggers() {
            return [{
                name: 'Blog Pages',
                type: 'pageview',
                triggerId: '2',
                filter: [{
                    type: 'contains',
                    parameter: [
                        { type: 'template', key: 'arg0', value: '{{Page Path}}' },
                        { type: 'template', key: 'arg1', value: '/blog' },
                    ],
                }],
            }];
        },
        async enableBuiltInVariable() {
            return { name: 'clickUrl', type: 'clickUrl', enabled: true, status: 'already_enabled' };
        },
    };

    await assert.rejects(
        () => setupGa4Defaults(fakeManager, 'G-EXPECTED'),
        /not attached to a pageview trigger/,
    );
});

test('setupGa4Defaults rejects a reused trigger without triggerId instead of falling back to All Pages', async () => {
    const fakeManager = {
        async listTags() {
            return [{
                name: 'GA4 Configuration',
                type: 'gaawc',
                parameter: [
                    { type: 'template', key: 'measurementId', value: 'G-EXPECTED' },
                    { type: 'boolean', key: 'sendPageView', value: 'true' },
                ],
                firingTriggerId: ['1'],
            }];
        },
        async listTriggers() {
            return [
                { name: 'All Pages', type: 'pageview', triggerId: '1' },
                {
                    name: 'Universal Lead Trigger',
                    type: 'customEvent',
                    customEventFilter: [{
                        type: 'equals',
                        parameter: [
                            { type: 'template', key: 'arg0', value: '{{_event}}' },
                            { type: 'template', key: 'arg1', value: 'generate_lead' },
                        ],
                    }],
                },
            ];
        },
        async enableBuiltInVariable() {
            return { name: 'clickUrl', type: 'clickUrl', enabled: true, status: 'already_enabled' };
        },
    };

    await assert.rejects(
        () => setupGa4Defaults(fakeManager, 'G-EXPECTED'),
        /Trigger 'Universal Lead Trigger' is missing triggerId/,
    );
});

test('setupGa4Defaults rejects narrowed link-click triggers with autoEventFilter drift', async () => {
    const fakeManager = {
        async listTags() {
            return [{
                name: 'GA4 Configuration',
                type: 'gaawc',
                parameter: [
                    { type: 'template', key: 'measurementId', value: 'G-EXPECTED' },
                    { type: 'boolean', key: 'sendPageView', value: 'true' },
                ],
                firingTriggerId: ['1'],
            }];
        },
        async listTriggers() {
            return [
                { name: 'All Pages', type: 'pageview', triggerId: '1' },
                {
                    name: 'Universal Lead Trigger',
                    type: 'customEvent',
                    triggerId: 'lead-1',
                    customEventFilter: [{
                        type: 'equals',
                        parameter: [
                            { type: 'template', key: 'arg0', value: '{{_event}}' },
                            { type: 'template', key: 'arg1', value: 'generate_lead' },
                        ],
                    }],
                },
                {
                    name: 'Outbound - LinkedIn',
                    type: 'linkClick',
                    triggerId: 'link-1',
                    filter: [{
                        type: 'contains',
                        parameter: [
                            { type: 'template', key: 'arg0', value: '{{Click URL}}' },
                            { type: 'template', key: 'arg1', value: 'linkedin.com' },
                        ],
                    }],
                    autoEventFilter: [{
                        type: 'contains',
                        parameter: [
                            { type: 'template', key: 'arg0', value: '{{Click Classes}}' },
                            { type: 'template', key: 'arg1', value: 'cta-only' },
                        ],
                    }],
                },
            ];
        },
        async enableBuiltInVariable() {
            return { name: 'clickUrl', type: 'clickUrl', enabled: true, status: 'already_enabled' };
        },
    };

    await assert.rejects(
        () => setupGa4Defaults(fakeManager, 'G-EXPECTED'),
        /Outbound - LinkedIn/,
    );
});

test('setupGa4Defaults rejects duplicate same-named GA4 configuration tags', async () => {
    const fakeManager = {
        async listTags() {
            return [
                {
                    name: 'GA4 Configuration',
                    type: 'gaawc',
                    parameter: [
                        { type: 'template', key: 'measurementId', value: 'G-EXPECTED' },
                        { type: 'boolean', key: 'sendPageView', value: 'true' },
                    ],
                    firingTriggerId: ['1'],
                },
                {
                    name: 'GA4 Configuration',
                    type: 'gaawc',
                    parameter: [
                        { type: 'template', key: 'measurementId', value: 'G-OTHER' },
                        { type: 'boolean', key: 'sendPageView', value: 'true' },
                    ],
                    firingTriggerId: ['1'],
                },
            ];
        },
        async listTriggers() {
            return [{ name: 'All Pages', type: 'pageview', triggerId: '1' }];
        },
        async enableBuiltInVariable() {
            return { name: 'clickUrl', type: 'clickUrl', enabled: true, status: 'already_enabled' };
        },
    };

    await assert.rejects(
        () => setupGa4Defaults(fakeManager, 'G-EXPECTED'),
        /Multiple GA4 configuration tags found/,
    );
});

test('setupGa4Defaults reuses a valid existing Google Tag regardless of its name', async () => {
    const fakeManager = {
        async listTags() {
            return [{
                name: 'Google Tag',
                type: 'gaawc',
                parameter: [
                    { type: 'template', key: 'measurementId', value: 'G-EXPECTED' },
                    { type: 'boolean', key: 'sendPageView', value: 'true' },
                ],
                firingTriggerId: ['renamed-pageview'],
            }];
        },
        async listTriggers() {
            return [{
                name: 'Toutes les pages',
                type: 'pageview',
                triggerId: 'renamed-pageview',
            }];
        },
        async enableBuiltInVariable() {
            return { name: 'clickUrl', type: 'clickUrl', enabled: true, status: 'already_enabled' };
        },
        async createGa4ConfigurationTag() {
            throw new Error('should not create a duplicate config tag');
        },
        async createTrigger(name) {
            return { name, triggerId: `${name}-id`, type: name === 'Universal Lead Trigger' ? 'customEvent' : 'linkClick' };
        },
        async createGa4EventTag() {
            return { tagId: 'created-tag' };
        },
    };

    const summary = await setupGa4Defaults(fakeManager, 'G-EXPECTED');
    assert.ok(summary.reusedTags.includes('Google Tag'));
});
