import 'dotenv/config';
import { GTMManager } from './dist/gtm/client.js';

async function main() {
    const gtmId = 'GTM-52MFG2';
    const gtm = new GTMManager();
    await gtm.initialize();
    await gtm.findContainer(gtmId);

    console.log('Listing Versions:');
    const versions = await gtm.listVersions();
    console.log(JSON.stringify(versions, null, 2));
}

main().catch(console.error);
