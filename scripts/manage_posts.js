#!/usr/bin/env node
import 'dotenv/config';
import { BusinessProfileClient } from '../dist/business/client.js';

async function managePosts() {
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
