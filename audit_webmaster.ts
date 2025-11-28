import { GSCClient } from './src/gsc/client';
import { GTMManager } from './src/gtm/client';

async function audit() {
    try {
        console.log('Starting Audit...\n');

        // --- GTM Audit ---
        console.log('### Google Tag Manager Audit');
        const gtm = new GTMManager();
        await gtm.initialize();
        const gtmId = 'GTM-PWS8Q6';

        console.log(`Connecting to container: ${gtmId}`);
        await gtm.findContainer(gtmId);

        const tags = await gtm.listTags();
        const triggers = await gtm.listTriggers();
        const variables = await gtm.listVariables();

        console.log(`- Tags found: ${tags.length}`);
        tags.forEach(t => console.log(`  - [${t.type}] ${t.name} (Firing: ${t.firingTriggerId?.length || 0} triggers)`));

        console.log(`- Triggers found: ${triggers.length}`);
        triggers.forEach(t => console.log(`  - [${t.type}] ${t.name}`));

        console.log(`- Variables found: ${variables.length}`);

        // Basic GTM Health Check
        const tagsWithoutTriggers = tags.filter(t => !t.firingTriggerId || t.firingTriggerId.length === 0);
        if (tagsWithoutTriggers.length > 0) {
            console.log('\n⚠️  WARNING: The following tags have no firing triggers:');
            tagsWithoutTriggers.forEach(t => console.log(`  - ${t.name}`));
        } else {
            console.log('\n✅ All tags have firing triggers.');
        }

        console.log('\n--------------------------------------------------\n');

        // --- GSC Audit ---
        console.log('### Google Search Console Audit');
        const gsc = await GSCClient.create();
        const siteUrl = 'https://aieafamilydental.com/';

        console.log(`Connecting to property: ${siteUrl}`);

        // Sitemaps
        try {
            const sitemaps = await gsc.listSitemaps(siteUrl);
            console.log(`- Sitemaps found: ${sitemaps.length}`);
            sitemaps.forEach(s => console.log(`  - ${s.path} (Last Downloaded: ${s.lastDownloaded})`));
        } catch (e) {
            console.log(`- Error listing sitemaps: ${e.message}`);
        }

        // Inspection (Homepage)
        console.log('\nInspecting Homepage Indexing Status...');
        try {
            const inspection = await gsc.inspectUrl(siteUrl, siteUrl);
            console.log('Full Inspection Result:', JSON.stringify(inspection, null, 2));

            const indexStatus = inspection.inspectionResult?.indexStatusResult;
            console.log(`- Coverage State: ${indexStatus?.coverageState}`);
            console.log(`- Indexing State: ${indexStatus?.indexingState}`);
            console.log(`- Mobile Usability: ${inspection.inspectionResult?.mobileUsabilityResult?.verdict}`);
        } catch (e) {
            console.log(`- Error inspecting URL: ${e.message}`);
        }

    } catch (error) {
        console.error('Audit failed:', error);
    }
}

audit();
