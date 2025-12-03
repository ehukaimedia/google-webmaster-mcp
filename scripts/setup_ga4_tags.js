#!/usr/bin/env node
import 'dotenv/config';
import { GTMManager } from '../dist/gtm/client.js';

async function setup() {
    const args = process.argv.slice(2);
    const gtmId = args[0] || process.env.GTM_ID;
    const measurementId = args[1] || process.env.GA4_MID;

    if (!gtmId || !measurementId) {
        console.error('Error: Missing configuration.');
        console.error('Please provide GTM_ID and GA4_MID (Measurement ID) via .env file or command line arguments.');
        process.exit(1);
    }

    try {
        const gtm = new GTMManager();
        await gtm.initialize();
        await gtm.findContainer(gtmId);

        // Helper to find existing entity
        const findEntity = (list, name) => list.find(i => i.name === name);

        // Load existing assets
        const existingTags = await gtm.listTags();
        const existingTriggers = await gtm.listTriggers();

        // 1. GA4 Configuration Tag
        console.log('Checking GA4 Configuration Tag...');
        let configTag = findEntity(existingTags, 'GA4 Configuration');
        if (!configTag) {
            configTag = await gtm.createGa4ConfigurationTag(
                'GA4 Configuration',
                measurementId,
                { triggerType: 'pageview', sendPageView: true }
            );
            console.log(`✅ Created Config Tag: ${configTag.tagId}`);
        } else {
            console.log(`ℹ️ Using existing Config Tag: ${configTag.tagId}`);
        }

        // 2. Triggers
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

        const contactTrigger = await ensureTrigger('Event - contact_click', 'contact_click');
        const leadTrigger = await ensureTrigger('Event - generate_lead', 'generate_lead');

        // 3. Event Tags
        console.log('\nChecking Event Tags...');

        const ensureEventTag = async (tagName, eventName, triggerId, params = {}) => {
            let tag = findEntity(existingTags, tagName);
            if (!tag) {
                await gtm.createGa4EventTag(
                    tagName,
                    measurementId,
                    eventName,
                    {
                        // configTagId: configTag.tagId, // Causing API error?
                        // triggerId: triggerId, // Wait, I need triggerId.
                        triggerId: triggerId,
                        eventParameters: params
                    }
                );
                console.log(`✅ Created Tag: ${tagName}`);
            } else {
                console.log(`ℹ️ Tag '${tagName}' already exists.`);
            }
        };

        await ensureEventTag('GA4 Event - Contact Click', 'contact_click', contactTrigger.triggerId, {
            method: '{{Click Text}}',
            type: 'contact'
        });

        await ensureEventTag('GA4 Event - Generate Lead', 'generate_lead', leadTrigger.triggerId);

    } catch (error) {
        console.error('Setup failed:', error);
        process.exit(1);
    }
}

setup();
