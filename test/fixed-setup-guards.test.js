import assert from 'node:assert/strict';
import test from 'node:test';
import {
    findMatchingConfigTag,
    isExpectedDataLayerVariable,
    isExpectedConfigTag,
    isExpectedCustomEventTrigger,
    isExpectedGa4EventTag,
} from '../dist/gtm/fixed-setup-guards.js';

function allPagesTrigger() {
    return {
        triggerId: 'trigger-1',
        name: 'All Pages',
        type: 'pageview',
    };
}

function ga4ConfigTag(overrides = {}) {
    return {
        tagId: 'tag-1',
        type: 'gaawc',
        firingTriggerId: ['trigger-1'],
        parameter: [
            { key: 'measurementId', type: 'template', value: 'G-WD68HPR7XC' },
            { key: 'sendPageView', type: 'boolean', value: 'true' },
        ],
        ...overrides,
    };
}

test('isExpectedConfigTag accepts a matching GA4 config tag on All Pages', () => {
    assert.equal(
        isExpectedConfigTag(ga4ConfigTag(), [allPagesTrigger()], 'G-WD68HPR7XC'),
        true,
    );

    assert.equal(
        isExpectedConfigTag(ga4ConfigTag({
            firingTriggerId: ['trigger-renamed'],
        }), [{
            triggerId: 'trigger-renamed',
            name: 'Alle Seiten',
            type: 'pageview',
        }], 'G-WD68HPR7XC'),
        true,
    );
});

test('isExpectedConfigTag rejects drifted measurement IDs and filtered triggers', () => {
    assert.equal(
        isExpectedConfigTag(ga4ConfigTag({
            parameter: [
                { key: 'measurementId', type: 'template', value: 'G-OTHER' },
                { key: 'sendPageView', type: 'boolean', value: 'true' },
            ],
        }), [allPagesTrigger()], 'G-WD68HPR7XC'),
        false,
    );

    assert.equal(
        isExpectedConfigTag(ga4ConfigTag(), [{
            ...allPagesTrigger(),
            filter: [{ type: 'equals', parameter: [] }],
        }], 'G-WD68HPR7XC'),
        false,
    );

    assert.equal(
        isExpectedConfigTag(ga4ConfigTag({
            parameter: [
                { key: 'measurementId', type: 'template', value: 'G-WD68HPR7XC' },
                { key: 'sendPageView', type: 'boolean', value: 'true' },
                { key: 'fieldsToSet', list: [] },
            ],
        }), [allPagesTrigger()], 'G-WD68HPR7XC'),
        false,
    );

    assert.equal(
        isExpectedConfigTag(ga4ConfigTag({
            parameter: [
                { key: 'measurementId', type: 'template', value: 'G-WD68HPR7XC' },
                { key: 'measurementId', type: 'template', value: 'G-OTHER' },
                { key: 'sendPageView', type: 'boolean', value: 'true' },
            ],
        }), [allPagesTrigger()], 'G-WD68HPR7XC'),
        false,
    );

    assert.equal(
        isExpectedConfigTag(ga4ConfigTag({
            parameter: [
                { key: 'measurementId', type: 'tagReference', value: 'G-WD68HPR7XC' },
                { key: 'sendPageView', type: 'boolean', value: 'true' },
            ],
        }), [allPagesTrigger()], 'G-WD68HPR7XC'),
        false,
    );
});

test('findMatchingConfigTag rejects duplicate GA4 configuration tags instead of guessing', () => {
    assert.throws(
        () => findMatchingConfigTag([
            ga4ConfigTag({ tagId: 'wrong-tag' }),
            ga4ConfigTag({ tagId: 'right-tag' }),
        ], [allPagesTrigger()], 'G-WD68HPR7XC'),
        /Multiple GA4 configuration tags found/,
    );
});

test('isExpectedCustomEventTrigger requires the exact _event equality shape', () => {
    const validTrigger = {
        name: 'Event - generate_lead',
        type: 'customEvent',
        customEventFilter: [{
            type: 'equals',
            parameter: [
                { key: 'arg0', type: 'template', value: '{{_event}}' },
                { key: 'arg1', type: 'template', value: 'generate_lead' },
            ],
        }],
    };

    assert.equal(isExpectedCustomEventTrigger(validTrigger, 'generate_lead'), true);
    assert.equal(isExpectedCustomEventTrigger({
        ...validTrigger,
        customEventFilter: [{
            type: 'contains',
            parameter: [
                { key: 'arg0', type: 'template', value: '{{_event}}' },
                { key: 'arg1', type: 'template', value: 'generate_lead' },
            ],
        }],
    }, 'generate_lead'), false);
    assert.equal(isExpectedCustomEventTrigger({
        ...validTrigger,
        customEventFilter: [{
            type: 'equals',
            parameter: [
                { key: 'arg0', type: 'template', value: '{{pagePath}}' },
                { key: 'arg1', type: 'template', value: 'generate_lead' },
            ],
        }],
    }, 'generate_lead'), false);
    assert.equal(isExpectedCustomEventTrigger({
        ...validTrigger,
        filter: [{ type: 'equals', parameter: [] }],
    }, 'generate_lead'), false);
    assert.equal(isExpectedCustomEventTrigger({
        ...validTrigger,
        customEventFilter: [{
            type: 'equals',
            parameter: [
                { key: 'arg0', type: 'constant', value: '{{_event}}' },
                { key: 'arg1', type: 'template', value: 'generate_lead' },
            ],
        }],
    }, 'generate_lead'), false);
});

test('isExpectedDataLayerVariable requires the expected DLV shape', () => {
    assert.equal(isExpectedDataLayerVariable({
        type: 'v',
        parameter: [
            { key: 'dataLayerVersion', type: 'integer', value: '2' },
            { key: 'setDefaultValue', type: 'boolean', value: 'false' },
            { key: 'name', type: 'template', value: 'location_id' },
        ],
    }, 'location_id'), true);

    assert.equal(isExpectedDataLayerVariable({
        type: 'jsm',
        parameter: [
            { key: 'name', value: 'location_id' },
        ],
    }, 'location_id'), false);

    assert.equal(isExpectedDataLayerVariable({
        type: 'v',
        parameter: [
            { key: 'dataLayerVersion', value: '2' },
            { key: 'setDefaultValue', value: 'false' },
            { key: 'name', value: 'location_id' },
            { key: 'defaultValue', value: 'fallback' },
        ],
    }, 'location_id'), false);

    assert.equal(isExpectedDataLayerVariable({
        type: 'v',
        parameter: [
            { key: 'dataLayerVersion', type: 'template', value: '2' },
            { key: 'setDefaultValue', type: 'boolean', value: 'false' },
            { key: 'name', type: 'template', value: 'location_id' },
        ],
    }, 'location_id'), false);
});

test('isExpectedGa4EventTag validates sendToTag, trigger, and event parameters', () => {
    const matchingTag = {
        type: 'gaawe',
        firingTriggerId: ['trigger-1'],
        parameter: [
            { key: 'eventName', type: 'template', value: 'view_location' },
            { key: 'sendToTag', type: 'tagReference', value: 'config-1' },
            {
                key: 'eventParameters',
                type: 'list',
                list: [{
                    type: 'map',
                    map: [
                        { key: 'name', type: 'template', value: 'location_id' },
                        { key: 'value', type: 'template', value: '{{dlv - location_id}}' },
                    ],
                }],
            },
        ],
    };

    assert.equal(isExpectedGa4EventTag(
        matchingTag,
        'view_location',
        'trigger-1',
        'config-1',
        { location_id: '{{dlv - location_id}}' },
    ), true);

    assert.equal(isExpectedGa4EventTag(
        {
            ...matchingTag,
            firingTriggerId: ['trigger-2'],
        },
        'view_location',
        'trigger-1',
        'config-1',
        { location_id: '{{dlv - location_id}}' },
    ), false);

    assert.equal(isExpectedGa4EventTag(
        {
            ...matchingTag,
            parameter: [
                ...matchingTag.parameter,
                { key: 'measurementId', value: 'G-WD68HPR7XC' },
            ],
        },
        'view_location',
        'trigger-1',
        'config-1',
        { location_id: '{{dlv - location_id}}' },
    ), false);

    assert.equal(isExpectedGa4EventTag(
        {
            ...matchingTag,
            parameter: [
                { key: 'eventName', value: 'view_location' },
                { key: 'eventName', value: 'wrong_event' },
                { key: 'sendToTag', value: 'config-1' },
                {
                    key: 'eventParameters',
                    list: [{
                        map: [
                            { key: 'name', value: 'location_id' },
                            { key: 'value', value: '{{dlv - location_id}}' },
                        ],
                    }],
                },
            ],
        },
        'view_location',
        'trigger-1',
        'config-1',
        { location_id: '{{dlv - location_id}}' },
    ), false);

    assert.equal(isExpectedGa4EventTag(
        {
            ...matchingTag,
            parameter: [
                { key: 'eventName', type: 'template', value: 'view_location' },
                { key: 'sendToTag', type: 'template', value: 'config-1' },
                {
                    key: 'eventParameters',
                    type: 'list',
                    list: [{
                        type: 'map',
                        map: [
                            { key: 'name', type: 'template', value: 'location_id' },
                            { key: 'value', type: 'template', value: '{{dlv - location_id}}' },
                        ],
                    }],
                },
            ],
        },
        'view_location',
        'trigger-1',
        'config-1',
        { location_id: '{{dlv - location_id}}' },
    ), false);

    assert.equal(isExpectedGa4EventTag(
        {
            ...matchingTag,
            parameter: [
                { key: 'eventName', type: 'template', value: 'view_location' },
                { key: 'sendToTag', type: 'tagReference', value: 'config-1' },
                {
                    key: 'eventParameters',
                    type: 'map',
                    list: [{
                        type: 'map',
                        map: [
                            { key: 'name', type: 'template', value: 'location_id' },
                            { key: 'value', type: 'template', value: '{{dlv - location_id}}' },
                        ],
                    }],
                },
            ],
        },
        'view_location',
        'trigger-1',
        'config-1',
        { location_id: '{{dlv - location_id}}' },
    ), false);
});

test('isExpectedGa4EventTag accepts a valid event tag with no custom parameters', () => {
    assert.equal(isExpectedGa4EventTag(
        {
            type: 'gaawe',
            firingTriggerId: ['trigger-1'],
            parameter: [
                { key: 'eventName', type: 'template', value: 'page_view' },
                { key: 'sendToTag', type: 'tagReference', value: 'config-1' },
            ],
        },
        'page_view',
        'trigger-1',
        'config-1',
        {},
    ), true);
});
