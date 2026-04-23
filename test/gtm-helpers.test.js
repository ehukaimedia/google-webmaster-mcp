import assert from 'node:assert/strict';
import test from 'node:test';
import {
    buildCustomEventFilter,
    buildGa4ConfigurationParameters,
    buildGa4EventParameters,
    validateWorkspaceAssets,
} from '../dist/gtm/helpers.js';

test('buildCustomEventFilter creates a custom event equality filter', () => {
    assert.deepEqual(buildCustomEventFilter('generate_lead'), [{
        type: 'equals',
        parameter: [
            { type: 'template', key: 'arg0', value: '{{_event}}' },
            { type: 'template', key: 'arg1', value: 'generate_lead' },
        ],
    }]);
});

test('buildGa4ConfigurationParameters includes measurement id, sendPageView, and fieldsToSet', () => {
    assert.deepEqual(buildGa4ConfigurationParameters('G-TEST123', {
        sendPageView: true,
        fieldsToSet: {
            currency: 'USD',
            environment: 'prod',
        },
    }), [
        { type: 'template', key: 'measurementId', value: 'G-TEST123' },
        { type: 'boolean', key: 'sendPageView', value: 'true' },
        {
            type: 'list',
            key: 'fieldsToSet',
            list: [
                {
                    type: 'map',
                    map: [
                        { type: 'template', key: 'name', value: 'currency' },
                        { type: 'template', key: 'value', value: 'USD' },
                    ],
                },
                {
                    type: 'map',
                    map: [
                        { type: 'template', key: 'name', value: 'environment' },
                        { type: 'template', key: 'value', value: 'prod' },
                    ],
                },
            ],
        },
    ]);
});

test('buildGa4EventParameters resolves variable references by id and name', () => {
    const parameters = buildGa4EventParameters('G-TEST123', 'click', {
        eventParameters: {
            link_url: { var: 'Click URL' },
            user_id: { varId: '12' },
            outbound: true,
        },
    }, [
        { variableId: '12', name: 'User ID' },
        { variableId: '34', name: 'Click URL' },
    ]);

    assert.deepEqual(parameters, [
        { type: 'template', key: 'eventName', value: 'click' },
        { type: 'template', key: 'measurementId', value: 'G-TEST123' },
        {
            type: 'list',
            key: 'measurementIdOverride',
            list: [{ type: 'template', value: 'G-TEST123' }],
        },
        {
            type: 'list',
            key: 'eventParameters',
            list: [
                {
                    type: 'map',
                    map: [
                        { type: 'template', key: 'name', value: 'link_url' },
                        { type: 'template', key: 'value', value: '{{Click URL}}' },
                    ],
                },
                {
                    type: 'map',
                    map: [
                        { type: 'template', key: 'name', value: 'user_id' },
                        { type: 'template', key: 'value', value: '{{User ID}}' },
                    ],
                },
                {
                    type: 'map',
                    map: [
                        { type: 'template', key: 'name', value: 'outbound' },
                        { type: 'template', key: 'value', value: 'true' },
                    ],
                },
            ],
        },
    ]);
});

test('validateWorkspaceAssets reports missing triggers and unresolved variables', () => {
    const result = validateWorkspaceAssets([
        {
            name: 'Broken Event Tag',
            type: 'gaawe',
            firingTriggerId: ['999'],
            parameter: [
                {
                    type: 'list',
                    key: 'eventParameters',
                    list: [{
                        type: 'map',
                        map: [
                            { type: 'template', key: 'name', value: 'link_url' },
                            { type: 'template', key: 'value', value: '{{Missing Variable}}' },
                        ],
                    }],
                },
            ],
        },
    ], [
        { variableId: '1', name: 'Known Variable' },
    ], [
        { triggerId: '2', name: 'Known Trigger' },
    ]);

    assert.equal(result.ok, false);
    assert.deepEqual(result.issues, [
        "Tag 'Broken Event Tag' references missing trigger 999",
        "GA4 Event 'Broken Event Tag' missing configTagId/measurementId",
        "Tag 'Broken Event Tag' references unknown variable '{{Missing Variable}}'",
    ]);
});

test('validateWorkspaceAssets accepts built-in GTM variables by name', () => {
    const result = validateWorkspaceAssets([
        {
            name: 'Built-in Variable Tag',
            type: 'gaawe',
            firingTriggerId: ['2'],
            parameter: [
                { type: 'template', key: 'measurementId', value: 'G-TEST123' },
                {
                    type: 'list',
                    key: 'eventParameters',
                    list: [{
                        type: 'map',
                        map: [
                            { type: 'template', key: 'name', value: 'link_url' },
                            { type: 'template', key: 'value', value: '{{Click URL}}' },
                        ],
                    }],
                },
            ],
        },
    ], [], [{ triggerId: '2', name: 'Known Trigger' }], [{ type: 'clickUrl', name: 'Click URL' }]);

    assert.equal(result.ok, true);
    assert.deepEqual(result.issues, []);
});

test('validateWorkspaceAssets reports missing variables referenced from trigger filters', () => {
    const result = validateWorkspaceAssets([], [], [{
        triggerId: '7',
        name: 'Broken Trigger',
        type: 'linkClick',
        filter: [{
            type: 'contains',
            parameter: [
                { type: 'template', key: 'arg0', value: '{{Missing Variable}}' },
                { type: 'template', key: 'arg1', value: 'linkedin.com' },
            ],
        }],
    }], []);

    assert.equal(result.ok, false);
    assert.deepEqual(result.issues, [
        "Trigger 'Broken Trigger' references unknown variable '{{Missing Variable}}'",
    ]);
});

test('validateWorkspaceAssets reports missing GA4 config tag references', () => {
    const result = validateWorkspaceAssets([
        {
            tagId: '7',
            name: 'Broken Event Tag',
            type: 'gaawe',
            parameter: [
                { type: 'tagReference', key: 'sendToTag', value: '999' },
            ],
        },
    ], [], []);

    assert.equal(result.ok, false);
    assert.deepEqual(result.issues, [
        "GA4 Event 'Broken Event Tag' references missing config tag 999",
    ]);
});
