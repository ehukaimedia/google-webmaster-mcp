#!/usr/bin/env node
import 'dotenv/config';
import { publishWorkspaceCommand } from '../dist/gtm/commands.js';

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
        console.log(`Creating and publishing a new version for container ${gtmId}...`);
        const result = await publishWorkspaceCommand(gtmId, versionNotes);
        console.log(`✅ Version ${result.versionId} published successfully.`);
    } catch (error) {
        console.error('Publish failed:', error);
        process.exit(1);
    }
}

publish();
