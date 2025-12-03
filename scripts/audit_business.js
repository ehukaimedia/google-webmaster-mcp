#!/usr/bin/env node
import 'dotenv/config';
import { BusinessProfileClient } from '../dist/business/client.js';

async function auditBusiness() {
    try {
        console.log('Initializing Business Profile Client...');
        const client = await BusinessProfileClient.create();

        console.log('\n--- Accounts ---');
        const accounts = await client.listAccounts();
        if (accounts.length === 0) {
            console.log('No accounts found.');
            return;
        }

        for (const account of accounts) {
            console.log(`- ${account.accountName} (${account.name})`);

            console.log(`  Fetching locations for ${account.name}...`);
            const locations = await client.listLocations(account.name);

            if (locations.length === 0) {
                console.log('  No locations found.');
                continue;
            }

            for (const location of locations) {
                console.log(`  - Location: ${location.title} (${location.name})`);

                // Construct resource name for reviews: accounts/{accountId}/locations/{locationId}
                // account.name is "accounts/{accountId}"
                // location.name is "locations/{locationId}"
                const accountId = account.name.split('/')[1];
                const locationId = location.name.split('/')[1];
                const resourceName = `accounts/${accountId}/locations/${locationId}`;

                console.log(`    Fetching reviews for ${resourceName}...`);
                try {
                    const reviews = await client.getReviews(resourceName);
                    console.log(`    Reviews found: ${reviews.length}`);

                    // Analyze reviews (e.g., unreplied)
                    const unreplied = reviews.filter(r => !r.reviewReply);
                    if (unreplied.length > 0) {
                        console.log(`    ⚠️  ${unreplied.length} unreplied reviews.`);
                        // Show latest unreplied
                        const latest = unreplied[0];
                        console.log(`       Latest: "${latest.comment?.substring(0, 50)}..." (${latest.starRating} stars)`);
                    } else {
                        console.log('    ✅ All reviews have replies.');
                    }
                } catch (e) {
                    console.log(`    ❌ Failed to fetch reviews: ${e.message}`);
                }
            }
        }

    } catch (error) {
        console.error('Audit failed:', error);
    }
}

auditBusiness();
