#!/usr/bin/env node
import 'dotenv/config';
import { BusinessProfileClient } from '../dist/business/client.js';

async function createPost() {
    try {
        const client = await BusinessProfileClient.create();
        const accounts = await client.listAccounts();

        // Target specific business setup
        const businessName = "Smile Innovations Hawaii";
        const configuredLocationId = process.env.BUSINESS_LOCATION_ID;

        console.log(`Searching for location...`);
        let targetLocation = null;
        let targetAccount = null;

        for (const account of accounts) {
            const locations = await client.listLocations(account.name);

            // Try to match by ID first, then by name
            const found = locations.find(l =>
                (configuredLocationId && l.name.endsWith(configuredLocationId)) ||
                l.title === businessName
            );

            if (found) {
                targetLocation = found;
                targetAccount = account;
                break;
            }
        }

        if (!targetLocation) {
            console.error(`Error: Could not find business location for "${businessName}" or ID "${configuredLocationId}"`);
            process.exit(1);
        }

        const accountId = targetAccount.name.split('/')[1];
        const locationId = targetLocation.name.split('/')[1];
        const resourceName = `accounts/${accountId}/locations/${locationId}`;

        console.log(`Creating post for: ${targetLocation.title} (${locationId})`);

        // SEO Optimized Post Content
        const postData = {
            topicType: 'STANDARD',
            languageCode: 'en-US',
            summary: "✨ New Website Launch: Honolulu's Premier Cosmetic & Sleep Dentistry ✨\n\nDr. Cecile Sebastian and the team at Smile Innovations Hawaii are proud to announce the launch of our updated digital experience! \n\nWe specialize in:\n😁 Cosmetic Dentistry (Veneers, Implants, Same-Day Crowns)\n😴 Sleep Dentistry (Sleep Apnea & Snoring Solutions)\n🦷 Advanced Technology (Solea Laser, 3D Imaging)\n\nVisit our new site to explore our services and schedule your consultation in downtown Honolulu.",
            callToAction: {
                actionType: 'LEARN_MORE',
                url: 'https://smileinnovationshawaii.com'
            }
        };

        const result = await client.createPost(resourceName, postData);
        console.log('✅ SEO Launch Post created successfully!');
        console.log(`View Post: ${result.searchUrl}`);

    } catch (error) {
        console.error('Failed to create post:', error);
        if (error.response) {
            console.error('API Error:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

createPost();
