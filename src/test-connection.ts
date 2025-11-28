import { GTMManager } from './gtm/client.js';
import { GSCClient } from './gsc/client.js';
import { AnalyticsClient } from './analytics/client.js';

async function test() {
    console.log('Testing GTM connection...');
    try {
        const gtm = new GTMManager();
        // Just initialize to check auth
        await gtm.initialize();
        console.log('✅ GTM Auth initialized');
    } catch (e) {
        console.error('❌ GTM Error:', e);
    }

    console.log('\nTesting GSC connection...');
    try {
        const gsc = await GSCClient.create();
        const sites = await gsc.listSites();
        console.log(`✅ GSC Connected. Found ${sites.length} sites.`);
    } catch (e) {
        console.error('❌ GSC Error:', e);
    }

    console.log('\nTesting Analytics connection...');
    try {
        const analytics = await AnalyticsClient.create();
        const summaries = await analytics.listAccountSummaries();
        console.log(`✅ Analytics Connected. Found ${summaries.length} account summaries.`);
    } catch (e) {
        console.error('❌ Analytics Error:', e);
    }
}

test();
