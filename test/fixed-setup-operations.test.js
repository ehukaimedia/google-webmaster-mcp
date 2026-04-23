import assert from 'node:assert/strict';
import test from 'node:test';
import {
    ensureCustomEventTrigger,
    ensureDataLayerVariable,
    ensureGa4EventTag,
    resolveGa4ConfigTag,
} from '../dist/gtm/fixed-setup-operations.js';

function createLogger() {
    return { log() {} };
}

test('resolveGa4ConfigTag recovers a matching config tag after create failure', async () => {
    const manager = {
        async createGa4ConfigurationTag() {
            throw new Error('duplicate');
        },
        async listTags() {
            return [{
                tagId: 'config-1',
                type: 'gaawc',
                firingTriggerId: ['trigger-1'],
                parameter: [
                    { key: 'measurementId', type: 'template', value: 'G-WD68HPR7XC' },
                    { key: 'sendPageView', type: 'boolean', value: 'true' },
                ],
            }];
        },
        async listTriggers() {
            return [{ triggerId: 'trigger-1', name: 'All Pages', type: 'pageview' }];
        },
    };

    assert.equal(
        await resolveGa4ConfigTag(manager, [], [], 'G-WD68HPR7XC', createLogger()),
        'config-1',
    );
});

test('resolveGa4ConfigTag recovery ignores unrelated non-config tags', async () => {
    const manager = {
        async createGa4ConfigurationTag() {
            throw new Error('duplicate');
        },
        async listTags() {
            return [
                {
                    tagId: 'event-1',
                    name: 'GA4 Event - View Location',
                    type: 'gaawe',
                    firingTriggerId: ['trigger-2'],
                    parameter: [
                        { key: 'eventName', type: 'template', value: 'view_location' },
                        { key: 'sendToTag', type: 'tagReference', value: 'config-1' },
                    ],
                },
                {
                    tagId: 'config-1',
                    type: 'gaawc',
                    firingTriggerId: ['trigger-1'],
                    parameter: [
                        { key: 'measurementId', type: 'template', value: 'G-WD68HPR7XC' },
                        { key: 'sendPageView', type: 'boolean', value: 'true' },
                    ],
                },
            ];
        },
        async listTriggers() {
            return [{ triggerId: 'trigger-1', name: 'All Pages', type: 'pageview' }];
        },
    };

    assert.equal(
        await resolveGa4ConfigTag(manager, [], [], 'G-WD68HPR7XC', createLogger()),
        'config-1',
    );
});

test('resolveGa4ConfigTag rejects duplicate GA4 configuration tags instead of reusing the first one', async () => {
    const manager = {
        async createGa4ConfigurationTag() {
            throw new Error('duplicate');
        },
        async listTags() {
            return [
                {
                    tagId: 'config-1',
                    type: 'gaawc',
                    firingTriggerId: ['trigger-1'],
                    parameter: [
                        { key: 'measurementId', type: 'template', value: 'G-WD68HPR7XC' },
                        { key: 'sendPageView', type: 'boolean', value: 'true' },
                    ],
                },
                {
                    tagId: 'config-2',
                    type: 'gaawc',
                    firingTriggerId: ['trigger-1'],
                    parameter: [
                        { key: 'measurementId', type: 'template', value: 'G-OTHER' },
                        { key: 'sendPageView', type: 'boolean', value: 'true' },
                    ],
                },
            ];
        },
        async listTriggers() {
            return [{ triggerId: 'trigger-1', name: 'All Pages', type: 'pageview' }];
        },
    };

    await assert.rejects(
        resolveGa4ConfigTag(manager, [], [], 'G-WD68HPR7XC', createLogger()),
        /Multiple GA4 configuration tags found/,
    );
});

test('ensureDataLayerVariable throws when create and recovery both fail', async () => {
    const manager = {
        async createVariable() {
            throw new Error('boom');
        },
        async listVariables() {
            return [];
        },
    };

    await assert.rejects(
        ensureDataLayerVariable(manager, [], 'dlv - location_id', 'location_id', createLogger()),
        /Failed to create or recover variable/,
    );
});

test('ensureDataLayerVariable rejects duplicate same-named variables', async () => {
    const duplicateVariables = [
        {
            name: 'dlv - location_id',
            type: 'v',
            parameter: [
                { key: 'dataLayerVersion', type: 'integer', value: '2' },
                { key: 'setDefaultValue', type: 'boolean', value: 'false' },
                { key: 'name', type: 'template', value: 'location_id' },
            ],
        },
        {
            name: 'dlv - location_id',
            type: 'v',
            parameter: [
                { key: 'dataLayerVersion', type: 'integer', value: '2' },
                { key: 'setDefaultValue', type: 'boolean', value: 'false' },
                { key: 'name', type: 'template', value: 'other_location_id' },
            ],
        },
    ];

    await assert.rejects(
        ensureDataLayerVariable({}, duplicateVariables, 'dlv - location_id', 'location_id', createLogger()),
        /Multiple variables named 'dlv - location_id' found/,
    );
});

test('ensureCustomEventTrigger recovers a matching trigger after create failure', async () => {
    const manager = {
        async createTrigger() {
            throw new Error('duplicate');
        },
        async listTriggers() {
            return [{
                triggerId: 'trigger-1',
                name: 'Event - view_location',
                type: 'customEvent',
                customEventFilter: [{
                    type: 'equals',
                    parameter: [
                        { key: 'arg0', type: 'template', value: '{{_event}}' },
                        { key: 'arg1', type: 'template', value: 'view_location' },
                    ],
                }],
            }];
        },
    };

    assert.equal(
        (await ensureCustomEventTrigger(manager, [], 'Event - view_location', 'view_location', createLogger())).triggerId,
        'trigger-1',
    );
});

test('ensureCustomEventTrigger rejects recovered triggers without a triggerId', async () => {
    const manager = {
        async createTrigger() {
            throw new Error('duplicate');
        },
        async listTriggers() {
            return [{
                name: 'Event - view_location',
                type: 'customEvent',
                customEventFilter: [{
                    type: 'equals',
                    parameter: [
                        { key: 'arg0', type: 'template', value: '{{_event}}' },
                        { key: 'arg1', type: 'template', value: 'view_location' },
                    ],
                }],
            }];
        },
    };

    await assert.rejects(
        ensureCustomEventTrigger(manager, [], 'Event - view_location', 'view_location', createLogger()),
        /missing triggerId/,
    );
});

test('ensureCustomEventTrigger rejects newly created triggers without a triggerId', async () => {
    const manager = {
        async createTrigger() {
            return {
                name: 'Event - view_location',
                type: 'customEvent',
                customEventFilter: [{
                    type: 'equals',
                    parameter: [
                        { key: 'arg0', type: 'template', value: '{{_event}}' },
                        { key: 'arg1', type: 'template', value: 'view_location' },
                    ],
                }],
            };
        },
        async listTriggers() {
            return [];
        },
    };

    await assert.rejects(
        ensureCustomEventTrigger(manager, [], 'Event - view_location', 'view_location', createLogger()),
        /missing triggerId/,
    );
});

test('ensureGa4EventTag throws when create fails and recovery is invalid', async () => {
    const manager = {
        async createGa4EventTag() {
            throw new Error('boom');
        },
        async listTags() {
            return [{
                tagId: 'tag-1',
                name: 'GA4 Event - View Location',
                type: 'gaawe',
                firingTriggerId: ['wrong-trigger'],
                parameter: [
                    { key: 'eventName', type: 'template', value: 'view_location' },
                    { key: 'sendToTag', type: 'tagReference', value: 'config-1' },
                ],
            }];
        },
    };

    await assert.rejects(
        ensureGa4EventTag(
            manager,
            [],
            'GA4 Event - View Location',
            'view_location',
            'trigger-1',
            'config-1',
            {},
            'G-WD68HPR7XC',
            createLogger(),
        ),
        /Failed to create or recover tag|Recovered tag/,
    );
});

test('ensureGa4EventTag rejects missing triggerId before creating a tag', async () => {
    await assert.rejects(
        ensureGa4EventTag(
            {},
            [],
            'GA4 Event - View Location',
            'view_location',
            undefined,
            'config-1',
            {},
            'G-WD68HPR7XC',
            createLogger(),
        ),
        /requires a triggerId/,
    );
});
