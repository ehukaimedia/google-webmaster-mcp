import http from 'node:http';
import https from 'node:https';
import { lookup } from 'node:dns/promises';
import type { LookupFunction } from 'node:net';
import { isIP } from 'node:net';
import { google, searchconsole_v1 } from 'googleapis';
import { getAuthClient } from '../auth/auth.js';
import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { XMLParser } from 'fast-xml-parser';

const MAX_SITEMAP_BYTES = 1024 * 1024;

type LookupEntry = { address: string; family: number };
type SitemapHttpClient = {
    get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
};
type LookupAllResolver = (hostname: string) => Promise<LookupEntry[]>;
type LookupSingleResolver = (hostname: string, family?: 4 | 6) => Promise<LookupEntry>;
type LookupAllCallback = (error: Error | null, addresses: LookupEntry[]) => void;
type LookupSingleCallback = (error: Error | null, address: string, family: number) => void;

function parseIpv6Hextets(ip: string): number[] | null {
    const normalized = ip.toLowerCase();
    const segments = normalized.split('::');
    if (segments.length > 2) {
        return null;
    }

    const [left, right = ''] = segments;
    const leftParts = left ? left.split(':') : [];
    const rightParts = right ? right.split(':') : [];

    if ([...leftParts, ...rightParts].some((part) => !/^[0-9a-f]{1,4}$/.test(part))) {
        return null;
    }

    const fillCount = 8 - (leftParts.length + rightParts.length);
    if ((normalized.includes('::') && fillCount < 0) || (!normalized.includes('::') && fillCount !== 0)) {
        return null;
    }

    const hextets = [
        ...leftParts,
        ...Array(normalized.includes('::') ? fillCount : 0).fill('0'),
        ...rightParts,
    ].map((part) => parseInt(part || '0', 16));

    if (hextets.length !== 8 || hextets.some((part) => Number.isNaN(part) || part < 0 || part > 0xffff)) {
        return null;
    }

    return hextets;
}

function matchesIpv6Prefix(hextets: number[], prefixHextets: number[], prefixLength: number): boolean {
    let remainingBits = prefixLength;

    for (let index = 0; index < 8 && remainingBits > 0; index += 1) {
        const bitsToCompare = Math.min(16, remainingBits);
        const mask = bitsToCompare === 16 ? 0xffff : (0xffff << (16 - bitsToCompare)) & 0xffff;
        if ((hextets[index] & mask) !== (prefixHextets[index] & mask)) {
            return false;
        }
        remainingBits -= bitsToCompare;
    }

    return true;
}

// Allow only currently allocated global-unicast IPv6 literal prefixes from IANA so
// sitemap fetches fail closed on reserved and special-use space.
const PUBLIC_IPV6_LITERAL_PREFIX_DEFINITIONS = [
    ['2001:200::', 23],
    ['2001:400::', 23],
    ['2001:600::', 23],
    ['2001:800::', 22],
    ['2001:c00::', 23],
    ['2001:e00::', 23],
    ['2001:1200::', 23],
    ['2001:1400::', 22],
    ['2001:1800::', 23],
    ['2001:1a00::', 23],
    ['2001:1c00::', 22],
    ['2001:2000::', 19],
    ['2001:4000::', 23],
    ['2001:4200::', 23],
    ['2001:4400::', 23],
    ['2001:4600::', 23],
    ['2001:4800::', 23],
    ['2001:4a00::', 23],
    ['2001:4c00::', 23],
    ['2001:5000::', 20],
    ['2001:8000::', 19],
    ['2001:a000::', 20],
    ['2001:b000::', 20],
    ['2003::', 18],
    ['2400::', 12],
    ['2410::', 12],
    ['2600::', 12],
    ['2610::', 23],
    ['2620::', 23],
    ['2630::', 12],
    ['2800::', 12],
    ['2a00::', 12],
    ['2a10::', 12],
    ['2c00::', 12],
 ] as const satisfies ReadonlyArray<readonly [string, number]>;

const PUBLIC_IPV6_LITERAL_PREFIXES: ReadonlyArray<{ hextets: number[]; prefixLength: number; }> =
    PUBLIC_IPV6_LITERAL_PREFIX_DEFINITIONS.map(([prefix, prefixLength]) => ({
    hextets: parseIpv6Hextets(prefix)!,
    prefixLength,
    }));

const NON_PUBLIC_IPV6_LITERAL_PREFIX_DEFINITIONS = [
    ['::1', 128],
    ['::', 128],
    ['::ffff:0:0', 96],
    ['64:ff9b::', 96],
    ['64:ff9b:1::', 48],
    ['100::', 64],
    ['100:0:0:1::', 64],
    ['2001::', 23],
    ['2001::', 32],
    ['2001:1::1', 128],
    ['2001:1::2', 128],
    ['2001:1::3', 128],
    ['2001:2::', 48],
    ['2001:3::', 32],
    ['2001:4:112::', 48],
    ['2001:10::', 28],
    ['2001:20::', 28],
    ['2001:30::', 28],
    ['2001:db8::', 32],
    ['2002::', 16],
    ['2620:4f:8000::', 48],
    ['3fff::', 20],
    ['5f00::', 16],
    ['fc00::', 7],
    ['fe80::', 10],
] as const satisfies ReadonlyArray<readonly [string, number]>;

const NON_PUBLIC_IPV6_LITERAL_PREFIXES: ReadonlyArray<{ hextets: number[]; prefixLength: number; }> =
    NON_PUBLIC_IPV6_LITERAL_PREFIX_DEFINITIONS.map(([prefix, prefixLength]) => ({
        hextets: parseIpv6Hextets(prefix)!,
        prefixLength,
    }));

function isPrivateIpv4(ip: string) {
    const octets = ip.split('.').map(Number);
    if (octets.length !== 4 || octets.some((octet) => Number.isNaN(octet) || octet < 0 || octet > 255)) {
        return false;
    }

    const [a, b, c, d] = octets;
    return (
        a === 10 ||
        a === 127 ||
        a === 0 ||
        (a === 100 && b >= 64 && b <= 127) ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 0 && c === 0 && d !== 9 && d !== 10) ||
        (a === 192 && b === 0 && c === 2) ||
        (a === 192 && b === 88 && c === 99) ||
        (a === 192 && b === 168) ||
        (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
        (a === 203 && b === 0 && c === 113) ||
        a >= 224
    );
}

function isPrivateIpv6(ip: string) {
    const normalized = ip.toLowerCase();
    if (normalized.startsWith('::ffff:')) {
        return true;
    }

    if (normalized === '::1' || normalized === '::') {
        return true;
    }

    const hextets = parseIpv6Hextets(normalized);
    if (!hextets) {
        return true;
    }

    if (NON_PUBLIC_IPV6_LITERAL_PREFIXES.some(({ hextets: prefixHextets, prefixLength }) =>
        matchesIpv6Prefix(hextets, prefixHextets, prefixLength)
    )) {
        return true;
    }

    return !PUBLIC_IPV6_LITERAL_PREFIXES.some(({ hextets: prefixHextets, prefixLength }) =>
        matchesIpv6Prefix(hextets, prefixHextets, prefixLength)
    );
}

function isPrivateAddress(address: string) {
    const family = isIP(address);
    if (family === 4) {
        return isPrivateIpv4(address);
    }
    if (family === 6) {
        return isPrivateIpv6(address);
    }
    return false;
}

async function resolveAllAddresses(hostname: string): Promise<LookupEntry[]> {
    return await lookup(hostname, { all: true, verbatim: true });
}

async function resolveAddress(hostname: string, family?: 4 | 6): Promise<LookupEntry> {
    return await lookup(hostname, { all: false, family, verbatim: true });
}

export async function assertSafeSitemapUrl(
    rawUrl: string,
    lookupAllResolver: LookupAllResolver = resolveAllAddresses
) {
    let parsed: URL;

    try {
        parsed = new URL(rawUrl);
    } catch {
        throw new Error('Invalid sitemap URL');
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Sitemap URL must use http or https');
    }

    if (parsed.username || parsed.password) {
        throw new Error('Sitemap URL must not contain credentials');
    }

    const rawHostname = parsed.hostname.toLowerCase();
    const hostname = rawHostname.startsWith('[') && rawHostname.endsWith(']')
        ? rawHostname.slice(1, -1)
        : rawHostname;

    if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
        throw new Error('Sitemap URL must point to a public host');
    }

    if (isPrivateAddress(hostname)) {
        throw new Error('Sitemap URL must not target a private or loopback IP');
    }

    if (isIP(hostname)) {
        return parsed;
    }

    const resolved = await lookupAllResolver(hostname);
    if (resolved.length === 0 || resolved.some((entry) => isPrivateAddress(entry.address))) {
        throw new Error('Sitemap URL resolved to a private or loopback address');
    }

    return parsed;
}

export function createSafeDnsLookup(
    lookupAllResolver: LookupAllResolver = resolveAllAddresses,
    lookupSingleResolver: LookupSingleResolver = resolveAddress
): LookupFunction {
    return (hostname, options, callback) => {
        const requestedFamily = options?.family === 4 || options?.family === 'IPv4'
            ? 4
            : options?.family === 6 || options?.family === 'IPv6'
                ? 6
                : undefined;
        const wantsAll = typeof options === 'object' && options !== null && 'all' in options && options.all === true;

        if (wantsAll) {
            lookupAllResolver(hostname)
                .then((entries) => {
                    const filteredEntries = requestedFamily
                        ? entries.filter((entry) => entry.family === requestedFamily)
                        : entries;

                    if (filteredEntries.length === 0) {
                        throw new Error('Sitemap URL did not resolve to a public address');
                    }

                    if (filteredEntries.some((entry) => isPrivateAddress(entry.address))) {
                        (callback as LookupAllCallback)(
                            new Error('Sitemap URL resolved to a private or loopback address'),
                            [],
                        );
                        return;
                    }

                    (callback as LookupAllCallback)(null, filteredEntries);
                })
                .catch((error) => {
                    (callback as LookupAllCallback)(
                        error instanceof Error ? error : new Error(String(error)),
                        [],
                    );
                });
            return;
        }

        lookupSingleResolver(hostname, requestedFamily)
            .then((entry) => {
                if (isPrivateAddress(entry.address)) {
                    (callback as LookupSingleCallback)(
                        new Error('Sitemap URL resolved to a private or loopback address'),
                        '',
                        0,
                    );
                    return;
                }

                (callback as LookupSingleCallback)(null, entry.address, entry.family);
            })
            .catch((error) => {
                (callback as LookupSingleCallback)(
                    error instanceof Error ? error : new Error(String(error)),
                    '',
                    0,
                );
            });
    };
}

export function createSitemapRequestConfig(
    lookupAllResolver: LookupAllResolver = resolveAllAddresses,
    lookupSingleResolver: LookupSingleResolver = resolveAddress
): AxiosRequestConfig<string> {
    const safeLookup = createSafeDnsLookup(lookupAllResolver, lookupSingleResolver);

    return {
        timeout: 10_000,
        responseType: 'text',
        maxRedirects: 0,
        maxContentLength: MAX_SITEMAP_BYTES,
        maxBodyLength: MAX_SITEMAP_BYTES,
        validateStatus: (status) => status >= 200 && status < 300,
        headers: {
            Accept: 'application/xml, text/xml;q=0.9, */*;q=0.1',
            'User-Agent': 'google-webmaster-mcp/1.0.0',
        },
        proxy: false,
        httpAgent: new http.Agent({ lookup: safeLookup }),
        httpsAgent: new https.Agent({ lookup: safeLookup }),
    };
}

export function extractSitemapUrls(xml: string): string[] {
    if (/<!DOCTYPE|<!ENTITY/i.test(xml)) {
        throw new Error('Sitemap XML with DTD or entity declarations is not supported');
    }

    const parser = new XMLParser();
    const jsonObj = parser.parse(xml);
    const urls: string[] = [];

    if (jsonObj.urlset && jsonObj.urlset.url) {
        const urlEntries = Array.isArray(jsonObj.urlset.url) ? jsonObj.urlset.url : [jsonObj.urlset.url];
        urlEntries.forEach((entry: any) => {
            if (entry.loc) urls.push(entry.loc);
        });
    } else if (jsonObj.sitemapindex && jsonObj.sitemapindex.sitemap) {
        const sitemapEntries = Array.isArray(jsonObj.sitemapindex.sitemap)
            ? jsonObj.sitemapindex.sitemap
            : [jsonObj.sitemapindex.sitemap];
        sitemapEntries.forEach((entry: any) => {
            if (entry.loc) urls.push(entry.loc);
        });
    }

    return urls;
}

export class GSCClient {
    private searchConsole: searchconsole_v1.Searchconsole;
    private readonly httpClient: SitemapHttpClient;
    private readonly lookupAllResolver: LookupAllResolver;
    private readonly lookupSingleResolver: LookupSingleResolver;

    constructor(
        authClient: any,
        httpClient: SitemapHttpClient = axios,
        lookupAllResolver: LookupAllResolver = resolveAllAddresses,
        lookupSingleResolver: LookupSingleResolver = resolveAddress
    ) {
        this.searchConsole = google.searchconsole({ version: 'v1', auth: authClient });
        this.httpClient = httpClient;
        this.lookupAllResolver = lookupAllResolver;
        this.lookupSingleResolver = lookupSingleResolver;
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
            const safeUrl = await assertSafeSitemapUrl(sitemapUrl, this.lookupAllResolver);
            const response = await this.httpClient.get<string>(
                safeUrl.toString(),
                createSitemapRequestConfig(this.lookupAllResolver, this.lookupSingleResolver)
            );
            const xml = typeof response.data === 'string' ? response.data : String(response.data ?? '');
            return extractSitemapUrls(xml);
        } catch (error) {
            throw new Error(`Failed to fetch or parse sitemap: ${error}`);
        }
    }
}
