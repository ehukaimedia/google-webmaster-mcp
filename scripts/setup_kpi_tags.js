#!/usr/bin/env node
import 'dotenv/config';
import { GTMManager } from '../dist/gtm/client.js';

async function setup() {
    const args = process.argv.slice(2);
    const gtmId = args[0] || process.env.GTM_ID;
    const measurementId = args[1] || process.env.GA4_MID;

    if (!gtmId || !measurementId) {
        console.error('Error: Missing configuration.');
        console.error('Please provide GTM_ID and GA4_MID via .env file or command line arguments.');
        process.exit(1);
    }

    try {
        const gtm = new GTMManager();
        await gtm.initialize();
        await gtm.findContainer(gtmId);

        const existingTags = await gtm.listTags();
        const existingTriggers = await gtm.listTriggers();
        const existingVariables = await gtm.listVariables();

        const findEntity = (list, name) => list.find(i => i.name === name);

        // 1. Create Data Layer Variables
        console.log('Checking Data Layer Variables...');
        const ensureDLV = async (name, dlvName) => {
            let variable = findEntity(existingVariables, name);
            if (!variable) {
                variable = await gtm.createVariable(
                    name,
                    'v', // Data Layer Variable type
                    [
                        { type: 'integer', key: 'dataLayerVersion', value: '2' },
                        { type: 'boolean', key: 'setDefaultValue', value: 'false' },
                        { type: 'template', key: 'name', value: dlvName }
                    ]
                );
                console.log(`✅ Created Variable '${name}': ${variable.variableId}`);
            } else {
                console.log(`ℹ️ Using existing Variable '${name}': ${variable.variableId}`);
            }
            return variable;
        };

        await ensureDLV('dlv - location_id', 'location_id');
        await ensureDLV('dlv - location_name', 'location_name');
        await ensureDLV('dlv - interaction_type', 'interaction_type');
        await ensureDLV('dlv - search_term', 'search_term');

        // 2. Create Triggers
        console.log('\nChecking Triggers...');
        const ensureTrigger = async (name, eventName) => {
            let trigger = findEntity(existingTriggers, name);
            if (!trigger) {
                trigger = await gtm.createTrigger(
                    name,
                    'customEvent',
                    [{
                        type: 'equals',
                        parameter: [
                            { type: 'template', key: 'arg0', value: '{{_event}}' },
                            { type: 'template', key: 'arg1', value: eventName }
                        ]
                    }]
                );
                console.log(`✅ Created Trigger '${name}': ${trigger.triggerId}`);
            } else {
                console.log(`ℹ️ Using existing Trigger '${name}': ${trigger.triggerId}`);
            }
            return trigger;
        };

        const viewLocationTrigger = await ensureTrigger('Event - view_location', 'view_location');
        const mapInteractionTrigger = await ensureTrigger('Event - map_interaction', 'map_interaction');
        const searchLocationTrigger = await ensureTrigger('Event - search_location', 'search_location');

        // 3. Create Event Tags
        console.log('\nChecking Event Tags...');
        const ensureEventTag = async (tagName, eventName, triggerId, params = {}) => {
            let tag = findEntity(existingTags, tagName);
            if (!tag) {
                await gtm.createGa4EventTag(
                    tagName,
                    measurementId,
                    eventName,
                    {
                        triggerId: triggerId,
                        eventParameters: params,
                        resolveVariables: true // To resolve {{dlv - ...}} names to IDs if needed, but createGa4EventTag implementation handles {{name}} lookups if passed as 'var' or just string {{...}}? 
                        // Looking at createGa4EventTag implementation:
                        // It checks if spec has 'var' or 'varId'. If we pass string "{{dlv - ...}}", it goes to `valueStr = String(spec)`.
                        // So passing "{{dlv - location_id}}" as value should work if GTM accepts it.
                    }
                );
                console.log(`✅ Created Tag: ${tagName}`);
            } else {
                console.log(`ℹ️ Tag '${tagName}' already exists.`);
            }
        };

        await ensureEventTag('GA4 Event - View Location', 'view_location', viewLocationTrigger.triggerId, {
            location_id: '{{dlv - location_id}}',
            location_name: '{{dlv - location_name}}'
        });

        await ensureEventTag('GA4 Event - Map Interaction', 'map_interaction', mapInteractionTrigger.triggerId, {
            interaction_type: '{{dlv - interaction_type}}'
        });

        await ensureEventTag('GA4 Event - Search Location', 'search_location', searchLocationTrigger.triggerId, {
            search_term: '{{dlv - search_term}}'
        });

        console.log('\nKPI Tags setup complete.');

    } catch (error) {
        console.error('Setup failed:', error);
        process.exit(1);
    }
}

setup();
