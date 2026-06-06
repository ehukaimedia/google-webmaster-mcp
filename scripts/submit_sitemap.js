#!/usr/bin/env node
import { config } from 'dotenv';
import { GSCClient } from '../dist/gsc/client.js';
import { getPackageVersion, hasHelpFlag, hasVersionFlag, printVersion } from './cli-utils.mjs';

config({ quiet: true });

async function submit() {
    const args = process.argv.slice(2);

    if (hasHelpFlag(args)) {
        console.log(`Google Webmaster Submit Sitemap ${getPackageVersion()}

Usage:
  google-webmaster-submit-sitemap [GSC_SITE] [SITEMAP_URL]

Reads GSC_SITE from the environment when omitted.

Options:
  --version, -v   Print the package version
  --help, -h      Show this help message`);
        return;
    }

    if (hasVersionFlag(args)) {
        printVersion();
        return;
    }

    const siteUrl = args[0] || process.env.GSC_SITE;
    const sitemapUrl = args[1] || (siteUrl ? `${siteUrl}/sitemap.xml` : undefined);

    if (!siteUrl || !sitemapUrl) {
        console.error('Error: Missing configuration.');
        console.error('Please provide GSC_SITE via .env file or command line arguments.');
        console.error('Usage: google-webmaster-submit-sitemap [SITE_URL] [SITEMAP_URL]');
        process.exit(1);
    }

    try {
        console.log(`Submitting sitemap: ${sitemapUrl} for site: ${siteUrl}`);
        const gsc = await GSCClient.create();
        const result = await gsc.submitSitemap(siteUrl, sitemapUrl);
        console.log('Result:', result);
    } catch (error) {
        console.error('Failed to submit sitemap:', error);
        process.exit(1);
    }
}

submit();
