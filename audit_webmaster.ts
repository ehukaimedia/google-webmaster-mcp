import { GSCClient } from './src/gsc/client';
import { AnalyticsClient } from './src/analytics/client';
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
        tags.forEach((t: any) => console.log(`  - [${t.type}] ${t.name} (Firing: ${t.firingTriggerId?.length || 0} triggers)`));

        console.log(`- Triggers found: ${triggers.length}`);
        triggers.forEach((t: any) => console.log(`  - [${t.type}] ${t.name}`));

        console.log(`- Variables found: ${variables.length}`);

        // Basic GTM Health Check
        const tagsWithoutTriggers = tags.filter((t: any) => !t.firingTriggerId || t.firingTriggerId.length === 0);
        if (tagsWithoutTriggers.length > 0) {
            console.log('\n⚠️  WARNING: The following tags have no firing triggers:');
            tagsWithoutTriggers.forEach((t: any) => console.log(`  - ${t.name}`));
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
        } catch (e: any) {
            console.log(`- Error listing sitemaps: ${e.message}`);
        }

        // Inspection (Homepage)
        console.log('\nInspecting Homepage Indexing Status...');
        try {
            const inspection = await gsc.inspectUrl(siteUrl, siteUrl);
            console.log('Full Inspection Result:', JSON.stringify(inspection, null, 2));

            const indexStatus = inspection?.indexStatusResult;
            console.log(`- Coverage State: ${indexStatus?.coverageState}`);
            console.log(`- Indexing State: ${indexStatus?.indexingState}`);
            console.log(`- Mobile Usability: ${inspection?.mobileUsabilityResult?.verdict}`);
        } catch (e: any) {
            console.log(`- Error inspecting URL: ${e.message}`);
        }

        // Performance Overview & Deep Dive Inspection
        console.log('\nFetching Performance Overview (Last 30 Days)...');
        try {
            const perf = await gsc.getPerformanceOverview(siteUrl, 30);
            console.log(`- Total Clicks: ${perf.totalClicks}`);
            console.log(`- Total Impressions: ${perf.totalImpressions}`);
            console.log(`- Avg CTR: ${perf.avgCtr}`);
            console.log('- Top Pages:');
            perf.topPages.forEach((p: any) => console.log(`  - ${p.page} (${p.clicks} clicks)`));

            // Deep Dive Inspection on Top Pages
            console.log('\nRunning Deep Dive Inspection on Top Pages...');
            for (const p of perf.topPages) {
                const pageUrl = p.page;
                if (!pageUrl) continue;
                console.log(`\nInspecting: ${pageUrl}`);
                try {
                    const inspection = await gsc.inspectUrl(siteUrl, pageUrl);
                    const indexStatus = inspection?.indexStatusResult;
                    console.log(`  - Coverage: ${indexStatus?.coverageState}`);
                    console.log(`  - Mobile Usability: ${inspection?.mobileUsabilityResult?.verdict}`);
                } catch (e: any) {
                    console.log(`  - Error inspecting ${pageUrl}: ${e.message}`);
                }
            }

        } catch (e: any) {
            console.log(`- Error fetching performance: ${e.message}`);
        }

        console.log('\n--------------------------------------------------\n');

        // --- GA4 Audit ---
        console.log('### Google Analytics 4 Audit');
        const analytics = await AnalyticsClient.create();
        const ga4PropertyId = '387066876';

        console.log(`Connecting to Property ID: ${ga4PropertyId}`);

        // Traffic Pulse
        console.log('\nFetching Traffic Pulse (Last 30 Days)...');
        try {
            const report = await analytics.runReport(
                ga4PropertyId,
                [{ startDate: '30daysAgo', endDate: 'today' }],
                [{ name: 'date' }],
                [{ name: 'activeUsers' }, { name: 'sessions' }],
                10
            );

            console.log('Date       | Active Users | Sessions');
            console.log('-----------|--------------|----------');
            report.rows?.forEach((row: any) => {
                const date = row.dimensionValues[0].value;
                const users = row.metricValues[0].value;
                const sessions = row.metricValues[1].value;
                console.log(`${date} | ${users.padEnd(12)} | ${sessions}`);
            });
        } catch (e: any) {
            console.log(`- Error fetching traffic report: ${e.message}`);
        }

    } catch (error) {
        console.error('Audit failed:', error);
    }
}

audit();
