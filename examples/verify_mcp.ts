import { GSCClient } from '../src/gsc/client.js';
import { GTMManager } from '../src/gtm/client.js';

async function main() {
    try {
        console.log('--- Verifying GSC ---');
        const gsc = await GSCClient.create();
        const sites = await gsc.listSites();
        console.log(`Successfully connected to GSC. Found ${sites.length} sites.`);
        if (sites.length > 0) {
            console.log('First site:', sites[0]);
        }

        console.log('\n--- Verifying GTM ---');
        const gtm = new GTMManager();
        await gtm.initialize();
        
        const args = process.argv.slice(2);
        if (args.length > 0) {
            const gtmId = args[0];
            console.log(`Looking for container ${gtmId}...`);
            const result = await gtm.findContainer(gtmId);
            console.log('Container found:', result.container.name);
        } else {
            console.log('No GTM ID provided to verify specific container lookup.');
            console.log('Listing accounts instead...');
            const accounts = await gtm.listAccounts();
            console.log(`Found ${accounts.length} accounts.`);
        }

    } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    }
}

main();
