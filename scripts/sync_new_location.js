#!/usr/bin/env node
import 'dotenv/config';
import { BusinessProfileClient } from '../dist/business/client.js';

async function syncNewLocation() {
    try {
        const client = await BusinessProfileClient.create();

        // Target: The new location found in audit
        // Account ID is the same: 109206396748810599388
        const accountId = '109206396748810599388';
        const locationId = '1965879076352000088';
        const locationName = `locations/${locationId}`;
        const resourceName = `accounts/${accountId}/locations/${locationId}`;

        console.log(`Syncing New Location: ${locationName}`);

        // 1. Inspect Current State
        console.log('\n--- Inspecting ---');
        const details = await client.getLocation(locationName, 'name,title,profile');
        console.log(`Title: ${details.title}`);
        console.log(`Current Description: ${details.profile?.description || 'None'}`);

        // 2. Optimize Description
        console.log('\n--- Optimizing Description ---');
        const newDescription = "Oahu Garage Doors is your trusted local expert for garage door repair, installation, and maintenance across the entire island of Oahu. Based in Waipahu, we provide same-day service for all major brands including Amarr, Wayne Dalton, Liftmaster, and Genie. Whether you need a new garage door for a home renovation, emergency spring replacement, or a quiet opener upgrade, our team delivers quality workmanship and aloha. Serving Honolulu, Kapolei, Ewa Beach, Mililani, Kailua, and surrounding communities. Call us today for a free estimate!";

        if (details.profile?.description !== newDescription) {
            await client.updateLocation(
                locationName,
                { profile: { description: newDescription } },
                'profile.description'
            );
            console.log('✅ Description updated to match main location.');
        } else {
            console.log('ℹ️ Description already matches.');
        }

        // 3. Create Holiday Post
        console.log('\n--- Creating Holiday Post ---');
        const postData = {
            topicType: 'STANDARD',
            summary: "🎄 Holiday Special! 🎄\n\nIs your garage door ready for the holiday rush? Ensure your home is safe and accessible for all your guests this season. We offer same-day repairs and tune-ups across Oahu. Don't let a squeaky or stuck door dampen your spirit!\n\nCall Oahu Garage Doors today for fast, reliable service. 🤙\n\n#OahuGarageDoors #HolidaySeason #GarageDoorRepair #Waipahu #Honolulu",
            callToAction: {
                actionType: 'LEARN_MORE',
                url: 'https://oahugaragedoors.com/contact-us/'
            }
        };

        // Check for existing recent posts to avoid duplicates (simple check)
        const recentPosts = await client.listPosts(resourceName);
        const duplicate = recentPosts.find(p => p.summary && p.summary.includes("Holiday Special"));

        if (duplicate) {
            console.log('ℹ️ Holiday post already exists.');
            console.log(`View: ${duplicate.searchUrl}`);
        } else {
            const result = await client.createPost(resourceName, postData);
            console.log('✅ Holiday Post created successfully!');
            console.log(`View: ${result.searchUrl}`);
        }

    } catch (error) {
        console.error('Sync failed:', error);
        if (error.response) {
            console.error('API Error:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

syncNewLocation();
