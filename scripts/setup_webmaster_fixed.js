#!/usr/bin/env node
import 'dotenv/config';
import { GTMManager } from '../dist/gtm/client.js';
import {
    ensureCustomEventTrigger,
    ensureDataLayerVariable,
    ensureGa4EventTag,
    resolveGa4ConfigTag,
} from '../dist/gtm/fixed-setup-operations.js';

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

        // Pin the discovered account/container instead of relying on GTM_ID lookup.
        gtm.selectContainer(ACCOUNT_ID, CONTAINER_ID);

        const existingTags = await gtm.listTags();
        const existingTriggers = await gtm.listTriggers();
        const existingVariables = await gtm.listVariables();

        // --- 1. Google Tag (GA4 Configuration) ---
        console.log('\n--- Checking/Creating Google Tag ---');
        const configTagId = await resolveGa4ConfigTag(gtm, existingTags, existingTriggers, MEASUREMENT_ID, console);

        // --- 2. KPI Tags (from setup_kpi_tags.js) ---
        console.log('\n--- Setting up KPIS ---');

        // Data Layer Variables
        const dlvLocationId = await ensureDataLayerVariable(gtm, existingVariables, 'dlv - location_id', 'location_id', console);
        const dlvLocationName = await ensureDataLayerVariable(gtm, existingVariables, 'dlv - location_name', 'location_name', console);
        const dlvInteractionType = await ensureDataLayerVariable(gtm, existingVariables, 'dlv - interaction_type', 'interaction_type', console);
        const dlvSearchTerm = await ensureDataLayerVariable(gtm, existingVariables, 'dlv - search_term', 'search_term', console);

        // Triggers
        const viewLocationTrigger = await ensureCustomEventTrigger(gtm, existingTriggers, 'Event - view_location', 'view_location', console);
        const mapInteractionTrigger = await ensureCustomEventTrigger(gtm, existingTriggers, 'Event - map_interaction', 'map_interaction', console);
        const searchLocationTrigger = await ensureCustomEventTrigger(gtm, existingTriggers, 'Event - search_location', 'search_location', console);
        const generateLeadTrigger = await ensureCustomEventTrigger(gtm, existingTriggers, 'Event - generate_lead', 'generate_lead', console); // Common conversion

        // Tags
        await ensureGa4EventTag(gtm, existingTags, 'GA4 Event - View Location', 'view_location', viewLocationTrigger.triggerId, configTagId, {
            location_id: '{{dlv - location_id}}',
            location_name: '{{dlv - location_name}}'
        }, MEASUREMENT_ID, console);

        await ensureGa4EventTag(gtm, existingTags, 'GA4 Event - Map Interaction', 'map_interaction', mapInteractionTrigger.triggerId, configTagId, {
            interaction_type: '{{dlv - interaction_type}}'
        }, MEASUREMENT_ID, console);

        await ensureGa4EventTag(gtm, existingTags, 'GA4 Event - Search Location', 'search_location', searchLocationTrigger.triggerId, configTagId, {
            search_term: '{{dlv - search_term}}'
        }, MEASUREMENT_ID, console);

        await ensureGa4EventTag(gtm, existingTags, 'GA4 Event - Generate Lead', 'generate_lead', generateLeadTrigger.triggerId, configTagId, {
            location_id: '{{dlv - location_id}}'
        }, MEASUREMENT_ID, console);

        console.log('\nSetup Complete.');

    } catch (error) {
        console.error('Setup failed:', error);
        process.exitCode = 1;
    }
}

setup();
