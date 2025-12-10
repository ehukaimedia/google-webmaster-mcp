#!/usr/bin/env node
import 'dotenv/config';
import { GTMManager } from '../dist/gtm/client.js';

// Hardcoded IDs from discovery
const ACCOUNT_ID = '6142216323';
const CONTAINER_ID = '138706108';
const MEASUREMENT_ID = 'G-WD68HPR7XC';

async function setup() {
    console.log('Using Fixed IDs:');
    console.log('Account:', ACCOUNT_ID);
    console.log('Container:', CONTAINER_ID);
    console.log('Measurement ID:', MEASUREMENT_ID);

    try {
        const gtm = new GTMManager();
        await gtm.initialize();

        // MANUALLY SET IDs to bypass findContainer
        gtm.accountId = ACCOUNT_ID;
        gtm.containerId = CONTAINER_ID;

        const existingTags = await gtm.listTags();
        const existingTriggers = await gtm.listTriggers();
        const existingVariables = await gtm.listVariables();

        const findEntity = (list, name) => list && list.find(i => i.name === name);

        // --- 1. Google Tag (GA4 Configuration) ---
        console.log('\n--- Checking/Creating Google Tag ---');
        // Check for existing config tag by type 'gaawc'
        const existingConfigTag = existingTags ? existingTags.find(t => t.type === 'gaawc') : null;

        let configTagId = existingConfigTag ? existingConfigTag.tagId : null;

        if (existingConfigTag) {
            console.log(`✅ Google Tag exists: ${existingConfigTag.name} (${existingConfigTag.tagId})`);
        } else {
            console.log('Creating Google Tag...');
            try {
                const newTag = await gtm.createGa4ConfigurationTag('Google Tag', MEASUREMENT_ID, {
                    sendPageView: true
                });
                configTagId = newTag.tagId;
                console.log(`✅ Created Google Tag: ${newTag.tagId}`);
            } catch (e) {
                if (e.code === 400 || e.message.includes('duplicate')) {
                    console.log('⚠️ Google Tag (or trigger) might already exist. Proceeding...');
                    // Try to find it again?
                    const tagsAgain = await gtm.listTags();
                    const found = tagsAgain.find(t => t.type === 'gaawc');
                    if (found) configTagId = found.tagId;
                } else {
                    throw e;
                }
            }
        }

        // --- 2. KPI Tags (from setup_kpi_tags.js) ---
        console.log('\n--- Setting up KPIS ---');

        // Data Layer Variables
        const ensureDLV = async (name, dlvName) => {
            let variable = findEntity(existingVariables, name);
            if (!variable) {
                try {
                    variable = await gtm.createVariable(
                        name,
                        'v',
                        [
                            { type: 'integer', key: 'dataLayerVersion', value: '2' },
                            { type: 'boolean', key: 'setDefaultValue', value: 'false' },
                            { type: 'template', key: 'name', value: dlvName }
                        ]
                    );
                    console.log(`✅ Created Variable '${name}': ${variable.variableId}`);
                } catch (e) { console.log(`⚠️ Skiping Variable ${name}: ${e.message}`); }
            } else {
                console.log(`ℹ️ Using existing Variable '${name}': ${variable.variableId}`);
            }
            return variable;
        };

        const dlvLocationId = await ensureDLV('dlv - location_id', 'location_id');
        const dlvLocationName = await ensureDLV('dlv - location_name', 'location_name');
        const dlvInteractionType = await ensureDLV('dlv - interaction_type', 'interaction_type');
        const dlvSearchTerm = await ensureDLV('dlv - search_term', 'search_term');

        // Triggers
        const ensureTrigger = async (name, eventName) => {
            let trigger = findEntity(existingTriggers, name);
            if (!trigger) {
                try {
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
                } catch (e) {
                    console.log(`⚠️ Skiping Trigger ${name}: ${e.message}`);
                    // return dummy or try to find
                }
            } else {
                console.log(`ℹ️ Using existing Trigger '${name}': ${trigger.triggerId}`);
            }
            return trigger;
        };

        const viewLocationTrigger = await ensureTrigger('Event - view_location', 'view_location');
        const mapInteractionTrigger = await ensureTrigger('Event - map_interaction', 'map_interaction');
        const searchLocationTrigger = await ensureTrigger('Event - search_location', 'search_location');
        const generateLeadTrigger = await ensureTrigger('Event - generate_lead', 'generate_lead'); // Common conversion

        // Tags
        const ensureEventTag = async (tagName, eventName, triggerId, params = {}) => {
            if (!triggerId) { console.log(`Skipping tag ${tagName} due to missing trigger`); return; }
            let tag = findEntity(existingTags, tagName);
            if (!tag) {
                try {
                    await gtm.createGa4EventTag(
                        tagName,
                        MEASUREMENT_ID,
                        eventName,
                        {
                            triggerId: triggerId,
                            configTagId: configTagId, // Link to config tag
                            eventParameters: params,
                            resolveVariables: true
                        }
                    );
                    console.log(`✅ Created Tag: ${tagName}`);
                } catch (e) { console.log(`⚠️ Failed to create tag ${tagName}: ${e.message}`); }
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

        await ensureEventTag('GA4 Event - Generate Lead', 'generate_lead', generateLeadTrigger.triggerId, {
            location_id: '{{dlv - location_id}}'
        });

        console.log('\nSetup Complete.');

    } catch (error) {
        console.error('Setup failed:', error);
    }
}

setup();
