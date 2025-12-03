#!/usr/bin/env node
import 'dotenv/config';
import { GTMManager } from '../dist/gtm/client.js';

async function validate() {
    const args = process.argv.slice(2);
    const gtmId = args[0] || process.env.GTM_ID;

    if (!gtmId) {
        console.error('Error: Missing configuration.');
        console.error('Please provide GTM_ID via .env file or command line arguments.');
        console.error('Usage: google-webmaster-gtm-validate [GTM_ID]');
        process.exit(1);
    }

    try {
        console.log(`Validating GTM Workspace for Container: ${gtmId}`);
        const gtm = new GTMManager();
        await gtm.initialize();
        await gtm.findContainer(gtmId);

        const result = await gtm.validateWorkspace();

        if (result.ok) {
            console.log('✅ Workspace is valid. No issues found.');
        } else {
            console.error('❌ Workspace validation failed with the following issues:');
            result.issues.forEach(issue => console.error(`  - ${issue}`));
            process.exit(1);
        }
    } catch (error) {
        console.error('Validation failed:', error);
        process.exit(1);
    }
}

validate();
