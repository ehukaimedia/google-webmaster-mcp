#!/usr/bin/env node
import 'dotenv/config';
import { BusinessProfileClient } from '../dist/business/client.js';

async function createPost() {
    try {
        const client = await BusinessProfileClient.create();
        const accounts = await client.listAccounts();
        const targetId = process.env.BUSINESS_LOCATION_ID;

        if (!targetId) {
            console.error('Error: BUSINESS_LOCATION_ID not set in .env');
            process.exit(1);
        }

        console.log(`Searching for Location ID: ${targetId}`);
        let targetLocation = null;
        let targetAccount = null;

        for (const account of accounts) {
            const locations = await client.listLocations(account.name);
            const found = locations.find(l => l.name.endsWith(targetId));
            if (found) {
                targetLocation = found;
                targetAccount = account;
                break;
            }
        }

        if (!targetLocation) {
            console.error('Location not found.');
            process.exit(1);
        }

        console.log(`Creating post for: ${targetLocation.title}`);

        const postData = {
            languageCode: 'en-US',
            summary: "Exciting news! We've added Oahu Garage Doors to our portfolio. Check out our latest work and updates to our Google Webmaster MCP tools. #EhukaiMedia #Portfolio #WebDevelopment",
            callToAction: {
                actionType: 'LEARN_MORE',
                url: 'https://ehukaimedia.com/#apps'
            },
            topicType: 'STANDARD'
        };

        // locationName should be "locations/{locationId}" but createPost might expect full resource name if not handled?
        // The client.js createPost uses `https://mybusiness.googleapis.com/v4/${locationName}/localPosts`.
        // If locationName is "locations/..." then URL is ".../v4/locations/.../localPosts".
        // BUT v4 API expects "accounts/{accountId}/locations/{locationId}/localPosts".
        // So we must construct the full name.
        
        const accountId = targetAccount.name.split('/')[1];
        const locationId = targetLocation.name.split('/')[1];
        const resourceName = `accounts/${accountId}/locations/${locationId}`;

        console.log(`Resource Name: ${resourceName}`);

        const result = await client.createPost(resourceName, postData);
        console.log('✅ Post created successfully!');
        console.log(`View at: ${result.searchUrl}`);

    } catch (error) {
        console.error('Failed to create post:', error);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

createPost();
