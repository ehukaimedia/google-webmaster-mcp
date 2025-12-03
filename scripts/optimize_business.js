#!/usr/bin/env node
import 'dotenv/config';
import { BusinessProfileClient } from '../dist/business/client.js';

async function optimizeBusiness() {
    try {
        const client = await BusinessProfileClient.create();
        const accounts = await client.listAccounts();

        let targetLocation = null;
        for (const account of accounts) {
            const locations = await client.listLocations(account.name);
            const found = locations.find(l => l.title === 'Oahu Garage Doors');
            if (found) {
                targetLocation = found;
                break;
            }
        }

        if (!targetLocation) {
            console.error('Location not found.');
            return;
        }

        console.log(`Optimizing: ${targetLocation.title}`);

        // New SEO-Optimized Description
        // Changes:
        // - Fixed sentence fragment ("Whether its new housing projects...")
        // - Added "island-wide" and specific city names (Kapolei, Ewa Beach, etc.) for local SEO.
        // - Emphasized "same-day service" and "emergency spring replacement" (high intent keywords).
        const newDescription = "Oahu Garage Doors is your trusted local expert for garage door repair, installation, and maintenance across the entire island of Oahu. Based in Waipahu, we provide same-day service for all major brands including Amarr, Wayne Dalton, Liftmaster, and Genie. Whether you need a new garage door for a home renovation, emergency spring replacement, or a quiet opener upgrade, our team delivers quality workmanship and aloha. Serving Honolulu, Kapolei, Ewa Beach, Mililani, Kailua, and surrounding communities. Call us today for a free estimate!";

        console.log('Updating description...');
        const result = await client.updateLocation(
            targetLocation.name,
            {
                profile: {
                    description: newDescription
                }
            },
            'profile.description'
        );

        console.log('✅ Description updated successfully!');
        console.log('New Description:', result.profile.description);

    } catch (error) {
        console.error('Optimization failed:', error);
    }
}

optimizeBusiness();
