import { GSCClient } from './dist/gsc/client.js';

async function listSites() {
    try {
        const gsc = await GSCClient.create();
        const sites = await gsc.listSites();
        console.log('Verified Sites in GSC:');
        sites.forEach(s => console.log(`- ${s.siteUrl} (Permission: ${s.permissionLevel})`));
    } catch (error) {
        console.error('Failed to list sites:', error);
    }
}

listSites();
