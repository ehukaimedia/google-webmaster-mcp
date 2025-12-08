#!/usr/bin/env node
import 'dotenv/config';
import { BusinessProfileClient } from '../dist/business/client.js';

async function updateEhukaiGMB() {
    try {
        console.log('Initializing Business Profile Client...');
        const client = await BusinessProfileClient.create();

        console.log('Fetching Accounts...');
        const accounts = await client.listAccounts();

        // Find Ehukai Media Location
        let targetLocation = null;
        for (const account of accounts) {
            console.log(`Checking account: ${account.name}`);
            const locations = await client.listLocations(account.name);
            const found = locations.find(l => l.title === 'Ehukai Media');
            if (found) {
                targetLocation = found;
                break;
            }
        }

        if (!targetLocation) {
            console.error('❌ Location "Ehukai Media" not found in any account.');
            return;
        }

        console.log(`✅ Found Location: ${targetLocation.title} (${targetLocation.name})`);

        // New Description from app/content/site.ts & Pillars
        // Limit: 750 characters
        const newDescription = `Ehukai Media is Hawaii's premier independent software studio, blending high-end aesthetics with data-driven growth strategies. We specialize in designing and building custom web and mobile applications that look premium and rank powerfully.

Our services include:
• Custom Web App Development: From complex dashboards to social platforms, we build robust software that lives in the browser.
• Intelligent SEO & Marketing: Built-in advanced schema and content strategies to drive organic growth.
• Premium UI/UX Design: Fluid animations and refined typography that build trust instantly.
• AI-Driven Development: Leveraging the latest tech for speed and scalability.

Based in Kapolei, serving clients worldwide.`;

        console.log('Updating description to:', newDescription);

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
        console.error('❌ Update failed:', error);
        process.exit(1);
    }
}

updateEhukaiGMB();
