import { GSCClient } from './gsc/client.js';
import { AnalyticsClient } from './analytics/client.js';
import { GTMManager } from './gtm/client.js';

async function main() {
    try {
        console.log('--- Finding ChiroCard Accounts ---');

        // 1. GSC
        console.log('\nChecking Google Search Console...');
        const gsc = await GSCClient.create();
        const sites = await gsc.listSites();
        console.log(`Found ${sites.length} sites.`);
        const chiroSite = sites.find(s => s.siteUrl.includes('chirocard'));
        if (chiroSite) {
            console.log('✅ Found ChiroCard GSC Property:', chiroSite.siteUrl);

            // Run basic inspection
            console.log('Running basic inspection for homepage...');
            try {
                const inspection = await gsc.inspectUrl(chiroSite.siteUrl, chiroSite.siteUrl);
                console.log('Index Status:', inspection?.indexStatusResult?.coverageState);
            } catch (e: any) {
                console.log('Error inspecting URL:', e.message);
            }

        } else {
            console.log('❌ ChiroCard GSC Property NOT found.');
            console.log('Available sites:', sites.map(s => s.siteUrl));
        }

        // 2. GTM
        console.log('\nChecking Google Tag Manager...');
        const gtm = new GTMManager();
        await gtm.initialize();

        const targetContainerId = 'GTM-5RGKKRRX';
        console.log(`Searching for container ${targetContainerId}...`);
        try {
            const container = await gtm.findContainer(targetContainerId);
            console.log('✅ Found ChiroCard GTM Container:', container.container.name);

            // List tags to see if GA4 is there
            const tags = await gtm.listTags();
            console.log(`Found ${tags.length} tags.`);
            const ga4Tags = tags.filter((t: any) => t.type === 'gaawc' || t.type === 'gaawe'); // gaawc = config, gaawe = event
            if (ga4Tags.length > 0) {
                console.log('✅ Found GA4 Tags in GTM:', ga4Tags.map((t: any) => t.name));
            } else {
                console.log('⚠️ No GA4 Tags found in GTM.');
            }

        } catch (e) {
            console.log('❌ ChiroCard GTM Container NOT found or not accessible.');
        }

        // 3. GA4
        console.log('\nChecking Google Analytics 4...');
        const analytics = await AnalyticsClient.create();
        const summaries = await analytics.listAccountSummaries();
        console.log(`Found ${summaries.length} account summaries.`);

        let ga4PropertyId = '';
        for (const account of summaries) {
            if (account.propertySummaries) {
                for (const prop of account.propertySummaries) {
                    if (prop.displayName && prop.displayName.toLowerCase().includes('chirocard')) {
                        console.log(`✅ Found ChiroCard GA4 Property: ${prop.displayName} (${prop.property})`);
                        ga4PropertyId = prop.property?.replace('properties/', '') || '';
                    }
                }
            }
        }

        if (!ga4PropertyId) {
            console.log('❌ ChiroCard GA4 Property NOT found in summaries.');
            // List all for debugging
            summaries.forEach(acc => {
                console.log(`Account: ${acc.displayName}`);
                acc.propertySummaries?.forEach(p => console.log(`  - ${p.displayName} (${p.property})`));
            });
        } else {
            // Run a quick report
            console.log(`Running quick report for property ${ga4PropertyId}...`);
            try {
                const report = await analytics.runReport(
                    ga4PropertyId,
                    [{ startDate: '30daysAgo', endDate: 'today' }],
                    [{ name: 'date' }],
                    [{ name: 'activeUsers' }, { name: 'sessions' }],
                    5
                );
                console.log('Report rows:', report.rowCount);
            } catch (e: any) {
                console.log('Error running report:', e.message);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

main();
