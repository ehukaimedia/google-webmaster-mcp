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

                // Test Update (Dry Run / Safe Update)
                // We will try to update the "storeCode" to its current value to verify the API call works without changing data.
                if (location.storeCode) {
                    console.log(`\nTesting Update on ${location.name}...`);
                    console.log(`Current Store Code: ${location.storeCode}`);

                    try {
                        const updated = await client.updateLocation(
                            location.name!,
                            { storeCode: location.storeCode },
                            'storeCode'
                        );
                        console.log('Update Successful!');
                        console.log('Updated Location:', JSON.stringify(updated, null, 2));
                    } catch (e: any) {
                        console.error('Update Failed:', e.message);
                    }
                } else {
                    console.log('Location has no storeCode, skipping update test.');
                }
            }
        }

    } catch (error: any) {
        console.error('Test failed:', error.message);
    }
}

test();
