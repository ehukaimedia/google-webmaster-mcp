import 'dotenv/config';
import { BusinessProfileClient } from '../src/business/client.js';

async function test() {
    try {
        console.log('Initializing Business Profile Client...');
        const client = await BusinessProfileClient.create();

        console.log('\nListing Accounts...');
        const accounts = await client.listAccounts();
        console.log(`Found ${accounts.length} accounts.`);

        if (accounts.length > 0) {
            const account = accounts[0];
            console.log(`Using Account: ${account.name} (${account.accountName})`);

            console.log('\nListing Locations...');
            const locations = await client.listLocations(account.name!);
            console.log(`Found ${locations.length} locations.`);

            if (locations.length > 0) {
                const location = locations[0];
                console.log(`Using Location: ${location.name} (${location.title})`);

                // Construct resource name for reviews: accounts/{accountId}/locations/{locationId}
                // location.name is usually "locations/{locationId}"
                // account.name is "accounts/{accountId}"
                const locId = location.name?.split('/')[1];
                const accId = account.name?.split('/')[1];
                const resourceName = `accounts/${accId}/locations/${locId}`;

                console.log(`\nFetching Reviews for ${resourceName}...`);
                try {
                    const reviews = await client.getReviews(resourceName);
                    console.log(`Found ${reviews.length} reviews.`);
                    if (reviews.length > 0) {
                        console.log('Sample Review:', JSON.stringify(reviews[0], null, 2));
                    }
                } catch (e: any) {
                    console.error('Error fetching reviews:', e.message);
                }
            }
        }

    } catch (error: any) {
        console.error('Test failed:', error.message);
    }
}

test();
