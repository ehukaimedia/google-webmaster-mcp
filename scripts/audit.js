#!/usr/bin/env node
import 'dotenv/config';
import { GSCClient } from '../dist/gsc/client.js';
import { AnalyticsClient } from '../dist/analytics/client.js';
import { GTMManager } from '../dist/gtm/client.js';

async function audit() {
    // Priority: Command Line Args > Environment Variables
    const args = process.argv.slice(2);
    const gtmId = args[0] || process.env.GTM_ID;
    const siteUrl = args[1] || process.env.GSC_SITE;
    const ga4PropertyId = args[2] || process.env.GA4_PROPERTY_ID;

    if (!gtmId || !siteUrl || !ga4PropertyId) {
        console.error('Error: Missing configuration.');
        console.error('Please provide GTM_ID, GSC_SITE, and GA4_PROPERTY_ID via .env file or command line arguments.');
        console.error('Usage: node scripts/audit.js [GTM_ID] [SITE_URL] [GA4_PROPERTY_ID]');
        process.exit(1);
    }

    console.log(`\nUsing Configuration:`);
    console.log(`- GTM ID: ${gtmId}`);
    console.log(`- Site URL: ${siteUrl}`);
    console.log(`- GA4 Property ID: ${ga4PropertyId}\n`);

    try {
        // --- GTM Audit ---
        console.log('### Google Tag Manager Audit');
        try {
            const gtm = new GTMManager();
            await gtm.initialize();
            await gtm.findContainer(gtmId);
            const tags = await gtm.listTags();
            console.log(`- Tags found: ${tags.length}`);
            tags.forEach(t => console.log(`  - [${t.type}] ${t.name}`));
        } catch (e) {
            console.error(`- GTM Error: ${e.message}`);
        }

        // --- GSC Audit ---
        console.log('\n### Google Search Console Audit');
        try {
            const gsc = await GSCClient.create();

            // Sitemaps
            const sitemaps = await gsc.listSitemaps(siteUrl);
            console.log(`- Sitemaps found: ${sitemaps.length}`);
            sitemaps.forEach(s => console.log(`  - ${s.path} (Last Downloaded: ${s.lastDownloaded})`));

            // Performance
            const perf = await gsc.getPerformanceOverview(siteUrl, 30);
            console.log(`- Performance (Last 30 Days):`);
            console.log(`  - Clicks: ${perf.totalClicks}`);
            console.log(`  - Impressions: ${perf.totalImpressions}`);
            console.log(`  - Top Pages:`);
            perf.topPages.forEach(p => console.log(`    - ${p.page} (${p.clicks} clicks)`));
        } catch (e) {
            console.error(`- GSC Error: ${e.message}`);
        }

        // --- GA4 Audit ---
        console.log('\n### Google Analytics 4 Audit');
        try {
            const analytics = await AnalyticsClient.create();
            const report = await analytics.runReport(
                ga4PropertyId,
                [{ startDate: '7daysAgo', endDate: 'today' }],
                [{ name: 'date' }],
                [{ name: 'activeUsers' }, { name: 'sessions' }],
                10
            );

            console.log('- Traffic Pulse (Last 7 Days):');
            console.log('  Date       | Active Users | Sessions');
            console.log('  -----------|--------------|----------');
            if (report.rows) {
                report.rows.forEach(row => {
                    const date = row.dimensionValues[0].value;
                    const users = row.metricValues[0].value;
                    const sessions = row.metricValues[1].value;
                    console.log(`  ${date} | ${users.padEnd(12)} | ${sessions}`);
                });
            } else {
                console.log('  No data returned.');
            }
        } catch (e) {
            console.error(`- GA4 Error: ${e.message}`);
        }

    } catch (error) {
        console.error('Audit failed:', error);
    }
}

audit();
