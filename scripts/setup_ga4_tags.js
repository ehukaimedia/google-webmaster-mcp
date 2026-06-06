#!/usr/bin/env node
import { config } from 'dotenv';
import { setupGa4Command } from '../dist/gtm/commands.js';
import { getPackageVersion, hasHelpFlag, hasVersionFlag, printVersion } from './cli-utils.mjs';

config({ quiet: true });

async function setup() {
    const args = process.argv.slice(2);

    if (hasHelpFlag(args)) {
        console.log(`Google Webmaster Setup GA4 ${getPackageVersion()}

Usage:
  google-webmaster-setup-ga4 [GTM_ID] [GA4_MID]

Reads GTM_ID and GA4_MID from the environment when omitted.

Options:
  --version, -v   Print the package version
  --help, -h      Show this help message`);
        return;
    }

    if (hasVersionFlag(args)) {
        printVersion();
        return;
    }

    const gtmId = args[0] || process.env.GTM_ID;
    const measurementId = args[1] || process.env.GA4_MID;

    if (!gtmId || !measurementId) {
        console.error('Error: Missing configuration.');
        console.error('Please provide GTM_ID and GA4_MID (Measurement ID) via .env file or command line arguments.');
        process.exit(1);
    }

    try {
        const summary = await setupGa4Command(gtmId, measurementId);
        console.log('Built-in variables enabled:', summary.enabledBuiltInVariables.length ? summary.enabledBuiltInVariables.join(', ') : 'none');
        console.log('Built-in variables reused:', summary.reusedBuiltInVariables.length ? summary.reusedBuiltInVariables.join(', ') : 'none');
        console.log('Triggers created:', summary.createdTriggers.length ? summary.createdTriggers.join(', ') : 'none');
        console.log('Triggers reused:', summary.reusedTriggers.length ? summary.reusedTriggers.join(', ') : 'none');
        console.log('Tags created:', summary.createdTags.length ? summary.createdTags.join(', ') : 'none');
        console.log('Tags reused:', summary.reusedTags.length ? summary.reusedTags.join(', ') : 'none');
    } catch (error) {
        console.error('Setup failed:', error);
        process.exit(1);
    }
}

setup();
