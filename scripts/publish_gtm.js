#!/usr/bin/env node
import 'dotenv/config';
import { GTMManager } from '../dist/gtm/client.js';

async function publish() {
    const args = process.argv.slice(2);
    const gtmId = args[0] || process.env.GTM_ID;
    const versionNotes = args[1] || 'Published via Google Webmaster MCP CLI';

    if (!gtmId) {
        console.error('Error: Missing configuration.');
        console.error('Please provide GTM_ID via .env file or command line arguments.');
        console.error('Usage: google-webmaster-gtm-publish [GTM_ID] [VERSION_NOTES]');
        process.exit(1);
    }

    try {
        const gtm = new GTMManager();
        await gtm.initialize();
        await gtm.findContainer(gtmId);

        console.log(`Creating new version for container ${gtmId}...`);
        const result = await gtm.createVersion('Version ' + new Date().toISOString(), versionNotes);

        if (result.versionId) {
            console.log(`Version created: ${result.versionId}`);
            console.log('Publishing version...');
            await gtm.publishVersion(result.versionId);
            console.log('✅ Version published successfully.');
        } else {
            console.error('❌ Failed to create version. Response:', result);
            process.exit(1);
        }
    } catch (error) {
        console.error('Publish failed:', error);
        process.exit(1);
    }
}

publish();
