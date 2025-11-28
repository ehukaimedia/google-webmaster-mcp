import { GSCClient } from './src/gsc/client';
import { GTMManager } from './src/gtm/client';

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
        const gtmId = 'GTM-PWS8Q6';
        console.log(`Looking for container ${gtmId}...`);
        const result = await gtm.findContainer(gtmId);
        console.log('Container found:', result.container.name);

    } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    }
}

main();
