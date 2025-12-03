import { GSCClient } from '../src/gsc/client.js';

async function submit() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log('Usage: ts-node examples/submit_sitemap.ts <SITE_URL> <SITEMAP_URL>');
        process.exit(1);
    }
    const [siteUrl, sitemapUrl] = args;

    try {
        console.log('Initializing GSC Client...');
        const gsc = await GSCClient.create();

        console.log(`Submitting sitemap: ${sitemapUrl}`);
        await gsc.submitSitemap(siteUrl, sitemapUrl);
        console.log('✅ Sitemap submitted successfully.');

        console.log('Verifying submission...');
        const sitemaps = await gsc.listSitemaps(siteUrl);
        const submitted = sitemaps.find(s => s.path === sitemapUrl);

        if (submitted) {
            console.log('Submission confirmed in GSC list:');
            console.log(`- Path: ${submitted.path}`);
            console.log(`- Last Downloaded: ${submitted.lastDownloaded || 'Pending'}`);
            console.log(`- Warnings: ${submitted.warnings || 0}`);
            console.log(`- Errors: ${submitted.errors || 0}`);
        } else {
            console.log('⚠️ Sitemap submitted but not yet appearing in list (this can take a moment).');
        }

    } catch (error) {
        console.error('Submission failed:', error);
        process.exit(1);
    }
}

submit();
