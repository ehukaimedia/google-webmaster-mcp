#!/usr/bin/env node
import 'dotenv/config';
import { AnalyticsClient } from '../dist/analytics/client.js';

async function list() {
    try {
        const analytics = await AnalyticsClient.create();

        console.log('Listing Account Summaries...');
        const summaries = await analytics.listAccountSummaries();

        if (!summaries || summaries.length === 0) {
            console.log('No account summaries found.');
            return;
        }

        for (const account of summaries) {
            console.log(`Account: ${account.displayName} (${account.account})`);
            if (account.propertySummaries) {
                for (const prop of account.propertySummaries) {
                    console.log(`  - Property: ${prop.displayName} (${prop.property})`);
                    try {
                        // Try to get data streams
                        const streams = await analytics.listDataStreams(prop.property.split('/').pop()); // "properties/123" -> "123"
                        for (const stream of streams) {
                            console.log(`    - Stream: ${stream.displayName} (Measurement ID: ${stream.webStreamData?.measurementId})`);
                        }
                    } catch (e) {
                        console.log(`    - Error listing streams: ${e.message}`);
                    }
                }
            } else {
                console.log('  - No properties.');
            }
        }
    } catch (error) {
        console.error('Script failed:', error);
    }
}

list();
