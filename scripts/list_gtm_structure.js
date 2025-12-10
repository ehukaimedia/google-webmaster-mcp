#!/usr/bin/env node
import 'dotenv/config';
import { GTMManager } from '../dist/gtm/client.js';

async function list() {
    try {
        const gtm = new GTMManager();
        await gtm.initialize();

        console.log('Listing Accounts...');
        // Accessing the underlying tagManager client. 
        // In the JS output it looked like `this.tagManager`.
        // If it's not directly accessible, this will fail.
        if (!gtm.tagManager) {
            console.error('Error: tagManager instance not accessible on GTMManager.');
            console.log('Keys on gtm:', Object.keys(gtm));
            return;
        }

        const accounts = await gtm.tagManager.accounts.list();

        if (!accounts.data.account || accounts.data.account.length === 0) {
            console.log('No accounts found.');
            return;
        }

        for (const acc of accounts.data.account) {
            console.log(`Account: ${acc.name} (${acc.accountId})`);
            try {
                const containers = await gtm.tagManager.accounts.containers.list({ parent: acc.path });
                if (containers.data.container) {
                    for (const cont of containers.data.container) {
                        console.log(`  - Container: ${cont.name} (Public ID: ${cont.publicId}) (Container ID: ${cont.containerId})`);
                    }
                } else {
                    console.log('  - No containers found.');
                }
            } catch (err) {
                console.error(`  - Error listing containers for ${acc.name}: ${err.message}`);
            }
        }
    } catch (error) {
        console.error('Script failed:', error);
    }
}

list();
