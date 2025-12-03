import { AnalyticsClient } from './analytics/client.js';
import { GTMManager } from './gtm/client.js';

async function main() {
    try {
        console.log('--- Setting up SEO Connections ---');

        const ga4PropertyId = '514713972'; // Found in previous step
        const gtmContainerId = 'GTM-5RGKKRRX'; // Found in previous step
        const accountId = '4700374404'; // Need to find this dynamically or hardcode if known. 
        // Actually GTMManager.findContainer finds it.

        // 1. Get Measurement ID from GA4
        console.log('\nFetching Measurement ID from GA4...');
        const analytics = await AnalyticsClient.create();
        const streams = await analytics.listDataStreams(ga4PropertyId);
        const webStream = streams.find((s: any) => s.type === 'WEB_DATA_STREAM');

        if (!webStream?.webStreamData?.measurementId) {
            throw new Error('No Web Data Stream or Measurement ID found in GA4 property.');
        }
        const measurementId = webStream.webStreamData.measurementId;
        console.log(`✅ Found Measurement ID: ${measurementId}`);

        // 2. Configure GTM
        console.log('\nConfiguring GTM...');
        const gtm = new GTMManager();
        await gtm.initialize();
        const containerInfo = await gtm.findContainer(gtmContainerId);
        console.log(`Connected to GTM Container: ${containerInfo.container.name}`);

        // Check if tag exists
        const tags = await gtm.listTags();
        const existingTag = tags.find((t: any) => t.name === 'GA4 Configuration');

        if (existingTag) {
            console.log('ℹ️ GA4 Configuration tag already exists.');
        } else {
            console.log('Creating GA4 Configuration tag...');
            // We need to find the "Initialization - All Pages" trigger or "All Pages"
            const triggers = await gtm.listTriggers();
            let trigger = triggers.find((t: any) => t.name === 'Initialization - All Pages');
            if (!trigger) {
                trigger = triggers.find((t: any) => t.name === 'All Pages');
            }

            if (!trigger) {
                console.log('Creating "All Pages" trigger...');
                // Fallback if no default trigger found (unlikely for new container)
                // For now, let's assume one exists or we might need to create one.
                // But usually "All Pages" is built-in or default.
                // Let's try to find any pageview trigger.
                trigger = triggers.find((t: any) => t.type === 'pageview');
            }

            if (!trigger) {
                throw new Error('No Page View trigger found to fire the tag.');
            }

            await gtm.createGa4ConfigurationTag(
                'GA4 Configuration',
                measurementId,
                { triggerType: 'pageview', triggerId: trigger.triggerId }
            );
            console.log('✅ Created GA4 Configuration tag.');

            // 3. Publish
            console.log('Publishing changes...');
            const versionResult = await gtm.createVersion('Added GA4 Configuration');
            await gtm.publishVersion(versionResult.versionId);
            console.log(`✅ Published version ${versionResult.versionId}`);
        }

    } catch (error) {
        console.error('Setup failed:', error);
    }
}

main();
