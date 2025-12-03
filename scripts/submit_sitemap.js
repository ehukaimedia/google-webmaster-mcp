#!/usr/bin/env node
import 'dotenv/config';
import { GSCClient } from '../dist/gsc/client.js';

async function submit() {
    const args = process.argv.slice(2);
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
