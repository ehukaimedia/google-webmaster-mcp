import { google, searchconsole_v1 } from 'googleapis';
import { getAuthClient } from '../auth/auth.js';
import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';

export class GSCClient {
    private searchConsole: searchconsole_v1.Searchconsole;

    constructor(authClient: any) {
        this.searchConsole = google.searchconsole({ version: 'v1', auth: authClient });
    }

    static async create() {
        const authClient = await getAuthClient();
        return new GSCClient(authClient);
    }

    async listSites() {
        const res = await this.searchConsole.sites.list();
        return res.data.siteEntry || [];
    }

    async queryAnalytics(
        siteUrl: string,
        startDate: string,
        endDate: string,
        dimensions?: string[],
        rowLimit?: number
    ) {
        const res = await this.searchConsole.searchanalytics.query({
            siteUrl,
            requestBody: {
                startDate,
                endDate,
                dimensions,
                rowLimit,
            },
        });
        return res.data.rows || [];
    }

    async getPerformanceOverview(siteUrl: string, days: number = 30) {
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const [overview, topPages] = await Promise.all([
            this.queryAnalytics(siteUrl, startDate, endDate, ['date']),
            this.queryAnalytics(siteUrl, startDate, endDate, ['page'], 5)
        ]);

        const totalClicks = overview.reduce((sum, row) => sum + (row.clicks || 0), 0);
        const totalImpressions = overview.reduce((sum, row) => sum + (row.impressions || 0), 0);
        const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

        return {
            period: `${days} days (${startDate} to ${endDate})`,
            totalClicks,
            totalImpressions,
            avgCtr: avgCtr.toFixed(2) + '%',
            topPages: topPages.map(p => ({
                page: p.keys?.[0],
                clicks: p.clicks,
                impressions: p.impressions
            }))
        };
    }

    async inspectUrl(siteUrl: string, inspectionUrl: string, languageCode: string = 'en-US') {
        const res = await this.searchConsole.urlInspection.index.inspect({
            requestBody: {
                inspectionUrl,
                siteUrl,
                languageCode,
            },
        });
        return res.data.inspectionResult;
    }

    async submitSitemap(siteUrl: string, feedpath: string) {
        await this.searchConsole.sitemaps.submit({
            siteUrl,
            feedpath,
        });
        return { success: true, message: `Sitemap ${feedpath} submitted for ${siteUrl}` };
    }

    async listSitemaps(siteUrl: string) {
        const res = await this.searchConsole.sitemaps.list({
            siteUrl,
        });
        return res.data.sitemap || [];
    }

    async fetchSitemapUrls(sitemapUrl: string) {
        try {
            const response = await axios.get(sitemapUrl);
            const parser = new XMLParser();
            const jsonObj = parser.parse(response.data);

            const urls: string[] = [];

            if (jsonObj.urlset && jsonObj.urlset.url) {
                // Standard sitemap
                const urlEntries = Array.isArray(jsonObj.urlset.url) ? jsonObj.urlset.url : [jsonObj.urlset.url];
                urlEntries.forEach((entry: any) => {
                    if (entry.loc) urls.push(entry.loc);
                });
            } else if (jsonObj.sitemapindex && jsonObj.sitemapindex.sitemap) {
                // Sitemap index
                const sitemapEntries = Array.isArray(jsonObj.sitemapindex.sitemap) ? jsonObj.sitemapindex.sitemap : [jsonObj.sitemapindex.sitemap];
                sitemapEntries.forEach((entry: any) => {
                    if (entry.loc) urls.push(entry.loc);
                });
            }

            return urls;
        } catch (error) {
            throw new Error(`Failed to fetch or parse sitemap: ${error}`);
        }
    }
}
