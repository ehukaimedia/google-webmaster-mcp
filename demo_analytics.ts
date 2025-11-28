import { AnalyticsClient } from './src/analytics/client';

async function demo() {
    try {
        console.log('Initializing Analytics Client...');
        const client = await AnalyticsClient.create();

        // 1. List Accounts to find Property ID
        console.log('\n--- Account Summaries ---');
        const summaries = await client.listAccountSummaries();

        let propertyId = '';
        summaries.forEach((account: any) => {
            console.log(`Account: ${account.account} (${account.displayName})`);
            account.propertySummaries?.forEach((prop: any) => {
                console.log(`  - Property: ${prop.property} (${prop.displayName})`);
                if (prop.displayName.toLowerCase().includes('aieafamilydental')) {
                    propertyId = prop.property.split('/')[1];
                }
            });
        });

        if (!propertyId) {
            console.log('Could not find "Aiea Family Dental" property automatically. Using first available if any.');
            const firstProp = summaries[0]?.propertySummaries?.[0];
            if (firstProp && firstProp.property) propertyId = firstProp.property.split('/')[1];
        }

        if (propertyId) {
            console.log(`\nUsing Property ID: ${propertyId}`);

            // 2. Run a Report: Active Users & Sessions (Last 30 Days)
            console.log('\n--- Report: Traffic Last 30 Days ---');
            const report = await client.runReport(
                propertyId,
                [{ startDate: '30daysAgo', endDate: 'today' }],
                [{ name: 'date' }],
                [{ name: 'activeUsers' }, { name: 'sessions' }],
                10 // Limit to last 10 days for brevity
            );

            console.log('Date       | Active Users | Sessions');
            console.log('-----------|--------------|----------');
            report.rows?.forEach((row: any) => {
                const date = row.dimensionValues[0].value;
                const users = row.metricValues[0].value;
                const sessions = row.metricValues[1].value;
                console.log(`${date} | ${users.padEnd(12)} | ${sessions}`);
            });

            // 3. Run a Report: Top Pages (Last 30 Days)
            console.log('\n--- Report: Top 5 Pages (Last 30 Days) ---');
            const pageReport = await client.runReport(
                propertyId,
                [{ startDate: '30daysAgo', endDate: 'today' }],
                [{ name: 'pagePath' }],
                [{ name: 'screenPageViews' }],
                5
            );

            console.log('Page Path                           | Views');
            console.log('------------------------------------|-------');
            pageReport.rows?.forEach((row: any) => {
                const path = row.dimensionValues[0].value;
                const views = row.metricValues[0].value;
                console.log(`${path.padEnd(35)} | ${views}`);
            });

        } else {
            console.error('No GA4 Property found.');
        }

    } catch (error) {
        console.error('Demo failed:', error);
    }
}

demo();
