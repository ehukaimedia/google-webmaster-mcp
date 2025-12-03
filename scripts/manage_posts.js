#!/usr/bin/env node
import 'dotenv/config';
import { BusinessProfileClient } from '../dist/business/client.js';

async function managePosts() {
    try {
        const client = await BusinessProfileClient.create();
        const accounts = await client.listAccounts();

        let targetLocation = null;
        let targetAccount = null;

        // Priority 1: BUSINESS_LOCATION_ID from .env
        if (process.env.BUSINESS_LOCATION_ID) {
            const targetId = process.env.BUSINESS_LOCATION_ID;
            console.log(`Searching for configured Location ID: ${targetId}`);

            for (const account of accounts) {
                const locations = await client.listLocations(account.name);
                const found = locations.find(l => l.name.endsWith(targetId));
                if (found) {
                    targetLocation = found;
                    targetAccount = account;
                    break;
                }
            }
        }

        // Priority 2: BUSINESS_NAME from .env or hardcoded fallback (for backward compatibility)
        if (!targetLocation) {
            const targetName = process.env.BUSINESS_NAME || 'Oahu Garage Doors';
            if (!process.env.BUSINESS_LOCATION_ID) {
                console.log(`No Location ID configured. Searching by name: "${targetName}"...`);
            }

            for (const account of accounts) {
                const locations = await client.listLocations(account.name);
                const found = locations.find(l => l.title === targetName);
                if (found) {
                    targetLocation = found;
                    targetAccount = account;
                    break;
                }
            }
        }

        if (!targetLocation || !targetAccount) {
            console.error('Location not found. Please set BUSINESS_LOCATION_ID in your .env file.');
            return;
        }

        console.log(`Managing Posts for: ${targetLocation.title}`);

        // Construct resource name: accounts/{accountId}/locations/{locationId}
        const accountId = targetAccount.name.split('/')[1];
        const locationId = targetLocation.name.split('/')[1];
        const resourceName = `accounts/${accountId}/locations/${locationId}`;

        console.log('Fetching active posts...');
        const posts = await client.listPosts(resourceName);

        if (posts.length === 0) {
            console.log('No active posts found.');
        } else {
            console.log(`Found ${posts.length} posts:`);
            posts.forEach(post => {
                console.log(`\n[${post.topicType}] ${post.searchUrl}`);
                console.log(`Summary: ${post.summary}`);
                console.log(`Created: ${post.createTime}`);
                console.log(`State: ${post.state}`);
            });
        }

    } catch (error) {
        console.error('Failed to manage posts:', error);
    }
}

managePosts();
