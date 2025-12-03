#!/usr/bin/env node
import 'dotenv/config';
import { BusinessProfileClient } from '../dist/business/client.js';

async function inspectBusiness() {
    try {
        const client = await BusinessProfileClient.create();
        const accounts = await client.listAccounts();

        // Find Oahu Garage Doors location
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
            console.error('Oahu Garage Doors location not found.');
            return;
        }

        console.log(`Inspecting: ${targetLocation.title} (${targetLocation.name})`);

        // Fetch full details
        // Fields to fetch: name, title, storeCode, categories, profile, serviceArea, regularHours, specialHours, metadata
        const readMask = 'name,title,storeCode,categories,profile,serviceArea,regularHours,specialHours,metadata,websiteUri,phoneNumbers';

        const details = await client.getLocation(targetLocation.name, readMask);

        console.log(JSON.stringify(details, null, 2));

    } catch (error) {
        console.error('Inspection failed:', error);
    }
}

inspectBusiness();
