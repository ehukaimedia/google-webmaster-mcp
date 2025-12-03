#!/usr/bin/env node
import 'dotenv/config';
import { BusinessProfileClient } from '../dist/business/client.js';

async function createPost() {
    try {
        const client = await BusinessProfileClient.create();
        const accounts = await client.listAccounts();

        let targetLocation = null;
        let targetAccount = null;

        for (const account of accounts) {
            const locations = await client.listLocations(account.name);
            const found = locations.find(l => l.title === 'Oahu Garage Doors');
            if (found) {
                targetLocation = found;
                targetAccount = account;
                break;
            }
        }

        if (!targetLocation || !targetAccount) {
            console.error('Location not found.');
            return;
        }

        const accountId = targetAccount.name.split('/')[1];
        const locationId = targetLocation.name.split('/')[1];
        const resourceName = `accounts/${accountId}/locations/${locationId}`;

        console.log(`Creating post for: ${targetLocation.title} (${resourceName})`);

        const postData = {
            topicType: 'STANDARD',
            summary: "🎄 Holiday Special! 🎄\n\nIs your garage door ready for the holiday rush? Ensure your home is safe and accessible for all your guests this season. We offer same-day repairs and tune-ups across Oahu. Don't let a squeaky or stuck door dampen your spirit!\n\nCall Oahu Garage Doors today for fast, reliable service. 🤙\n\n#OahuGarageDoors #HolidaySeason #GarageDoorRepair #Waipahu #Honolulu",
            callToAction: {
                actionType: 'LEARN_MORE',
                url: 'https://oahugaragedoors.com/contact-us/'
            }
        };

        const result = await client.createPost(resourceName, postData);
        console.log('✅ Post created successfully!');
        console.log('View Post:', result.searchUrl);

    } catch (error) {
        console.error('Failed to create post:', error);
        if (error.response) {
            console.error('API Error:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

createPost();
