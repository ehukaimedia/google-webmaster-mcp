#!/usr/bin/env node
import 'dotenv/config';
import { AnalyticsClient } from '../dist/analytics/client.js';

async function run() {
    const ga4PropertyId = process.env.GA4_PROPERTY_ID;
    if (!ga4PropertyId) {
        console.error('Missing GA4_PROPERTY_ID');
        process.exit(1);
    }
    console.log('Checking KPIs for Property: ' + ga4PropertyId);

    try {
        const analytics = await AnalyticsClient.create();
        const report = await analytics.runReport(
            ga4PropertyId,
            [{ startDate: '30daysAgo', endDate: 'today' }],
            [{ name: 'eventName' }],
            [{ name: 'eventCount' }],
            50
        );

        console.log('\nEvent Breakdown (Last 30 Days):');
        console.log('Event Name          | Count');
        console.log('--------------------|------');
        if (report.rows) {
            report.rows.forEach(row => {
               console.log(row.dimensionValues[0].value.padEnd(20) + ' | ' + row.metricValues[0].value);
            });
        } else {
             console.log('No rows returned.');
        }
    } catch (e) {
        console.error(e);
    }
}
run();
