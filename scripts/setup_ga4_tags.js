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

        // 0. Enable Built-in Variables
        console.log('Enabling Built-in Variables...');
        try {
            await gtm.enableBuiltInVariable('clickText');
            console.log('✅ Enabled Built-in Variable: Click Text');
        } catch (e) {
            console.log('ℹ️ Click Text might already be enabled or failed to enable:', e.message);
        }

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

        const ensureTrigger = async (name, type, filters) => {
            let trigger = findEntity(existingTriggers, name);
            if (!trigger) {
                trigger = await gtm.createTrigger(name, type, filters);
                console.log(`✅ Created Trigger '${name}': ${trigger.triggerId}`);
            } else {
                console.log(`ℹ️ Using existing Trigger '${name}': ${trigger.triggerId}`);
            }
            return trigger;
        };

        // Custom Event Triggers
        const waitlistTrigger = await ensureTrigger('G4 Waitlist Submit', 'customEvent', [{
            type: 'equals',
            parameter: [
                { type: 'template', key: 'arg0', value: '{{_event}}' },
                { type: 'template', key: 'arg1', value: 'waitlist_submit' }
            ]
        }]);

        // Link Click Triggers
        const githubTrigger = await ensureTrigger('Outbound - GitHub', 'linkClick', [{
            type: 'contains',
            parameter: [
                { type: 'template', key: 'arg0', value: '{{Click URL}}' },
                { type: 'template', key: 'arg1', value: 'github.com' }
            ]
        }]);

        const linkedinTrigger = await ensureTrigger('Outbound - LinkedIn', 'linkClick', [{
            type: 'contains',
            parameter: [
                { type: 'template', key: 'arg0', value: '{{Click URL}}' },
                { type: 'template', key: 'arg1', value: 'linkedin.com' }
            ]
        }]);

        const mailtoTrigger = await ensureTrigger('Support Intent - Mailto', 'linkClick', [{
            type: 'contains',
            parameter: [
                { type: 'template', key: 'arg0', value: '{{Click URL}}' },
                { type: 'template', key: 'arg1', value: 'mailto:' }
            ]
        }]);

        const telTrigger = await ensureTrigger('Support Intent - Tel', 'linkClick', [{
            type: 'contains',
            parameter: [
                { type: 'template', key: 'arg0', value: '{{Click URL}}' },
                { type: 'template', key: 'arg1', value: 'tel:' }
            ]
        }]);

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
                        triggerId: triggerId,
                        eventParameters: params
                    }
                );
                console.log(`✅ Created Tag: ${tagName}`);
            } else {
                console.log(`ℹ️ Tag '${tagName}' already exists.`);
            }
        };

        await ensureEventTag('GA4 - Lead Generation', 'generate_lead', waitlistTrigger.triggerId);

        await ensureEventTag('GA4 - Click GitHub', 'click', githubTrigger.triggerId, {
            link_url: '{{Click URL}}',
            outbound: true,
            outbound_dest: 'github'
        });

        await ensureEventTag('GA4 - Click LinkedIn', 'click', linkedinTrigger.triggerId, {
            link_url: '{{Click URL}}',
            outbound: true,
            outbound_dest: 'linkedin'
        });

        await ensureEventTag('GA4 - Contact Email', 'contact', mailtoTrigger.triggerId, {
            method: 'email'
        });

        await ensureEventTag('GA4 - Contact Phone', 'contact', telTrigger.triggerId, {
            method: 'phone'
        });

    } catch (error) {
        console.error('Setup failed:', error);
        process.exit(1);
    }
}

setup();
