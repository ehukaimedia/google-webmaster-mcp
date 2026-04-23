import assert from 'node:assert/strict';
import test from 'node:test';
import {
    GSCClient,
    assertSafeSitemapUrl,
    createSafeDnsLookup,
    createSitemapRequestConfig,
    extractSitemapUrls,
} from '../dist/gsc/client.js';

const MAX_SITEMAP_BYTES = 1024 * 1024;

test('assertSafeSitemapUrl rejects hosts that resolve to private addresses', async () => {
    await assert.rejects(
        assertSafeSitemapUrl('https://example.com/sitemap.xml', async () => [{ address: '127.0.0.1', family: 4 }]),
        /private or loopback/,
    );
});

test('assertSafeSitemapUrl rejects IPv4-mapped private IPv6 answers', async () => {
    await assert.rejects(
        assertSafeSitemapUrl('https://example.com/sitemap.xml', async () => [{ address: '::ffff:172.16.0.1', family: 6 }]),
        /private or loopback/,
    );
});

test('assertSafeSitemapUrl rejects non-public IPv4 ranges beyond RFC1918', async () => {
    for (const address of ['100.64.0.1', '198.18.0.1', '255.255.255.255']) {
        await assert.rejects(
            assertSafeSitemapUrl('https://example.com/sitemap.xml', async () => [{ address, family: 4 }]),
            /private or loopback/,
        );
    }
});

test('assertSafeSitemapUrl allows globally reachable 192.0.0.9 and 192.0.0.10 literals', async () => {
    for (const address of ['192.0.0.9', '192.0.0.10']) {
        const parsed = await assertSafeSitemapUrl(`https://${address}/sitemap.xml`, async () => {
            throw new Error('resolver should not be called for IP literals');
        });
        assert.equal(parsed.hostname, address);
    }
});

test('assertSafeSitemapUrl allows public IPv6 literal sitemap URLs without DNS lookup', async () => {
    let resolverCalled = false;

    const parsed = await assertSafeSitemapUrl('https://[2606:4700:4700::1111]/sitemap.xml', async () => {
        resolverCalled = true;
        throw new Error('resolver should not be called for IP literals');
    });

    assert.equal(parsed.hostname, '[2606:4700:4700::1111]');
    assert.equal(resolverCalled, false);
});

test('assertSafeSitemapUrl rejects special-use IPv6 prefixes that are not public fetch targets', async () => {
    for (const address of ['64:ff9b:1::a00:1', '2001:db8::1', '2002:0a00:0001::', '2620:4f:8000::1', '3f00::1', '3fff::1']) {
        await assert.rejects(
            assertSafeSitemapUrl('https://example.com/sitemap.xml', async () => [{ address, family: 6 }]),
            /private or loopback/,
        );
    }
});

test('createSafeDnsLookup rejects private DNS answers during connect-time lookup', async () => {
    const safeLookup = createSafeDnsLookup(
        async () => [{ address: '10.0.0.5', family: 4 }],
        async () => ({ address: '10.0.0.5', family: 4 }),
    );

    await new Promise((resolve, reject) => {
        safeLookup('example.com', { family: 4 }, (error, address, family) => {
            try {
                assert.match(String(error), /private or loopback/);
                assert.equal(typeof address, 'string');
                assert.equal(family, 0);
                resolve();
            } catch (assertionError) {
                reject(assertionError);
            }
        });
    });
});

test('createSafeDnsLookup supports Node lookup calls with all=true', async () => {
    const safeLookup = createSafeDnsLookup(
        async () => [
            { address: '93.184.216.34', family: 4 },
            { address: '2606:2800:220:1:248:1893:25c8:1946', family: 6 },
        ],
        async () => {
            throw new Error('single resolver should not be called when all=true');
        },
    );

    await new Promise((resolve, reject) => {
        safeLookup('example.com', { all: true }, (error, addresses) => {
            try {
                assert.equal(error, null);
                assert.deepEqual(addresses, [
                    { address: '93.184.216.34', family: 4 },
                    { address: '2606:2800:220:1:248:1893:25c8:1946', family: 6 },
                ]);
                resolve();
            } catch (assertionError) {
                reject(assertionError);
            }
        });
    });
});

test('createSitemapRequestConfig disables environment proxy resolution', () => {
    process.env.HTTP_PROXY = 'http://127.0.0.1:8080';
    process.env.HTTPS_PROXY = 'http://127.0.0.1:8080';

    const config = createSitemapRequestConfig(
        async () => [{ address: '93.184.216.34', family: 4 }],
        async () => ({ address: '93.184.216.34', family: 4 }),
    );

    assert.equal(config.proxy, false);

    delete process.env.HTTP_PROXY;
    delete process.env.HTTPS_PROXY;
});

test('extractSitemapUrls rejects sitemap XML with DTD declarations', () => {
    assert.throws(
        () => extractSitemapUrls('<!DOCTYPE foo><urlset></urlset>'),
        /DTD or entity declarations/,
    );
});

test('fetchSitemapUrls applies redirect and payload guardrails', async () => {
    let observedUrl;
    let observedConfig;

    const client = new GSCClient(
        {},
        {
            async get(url, config) {
                observedUrl = url;
                observedConfig = config;
                return {
                    data: '<urlset><url><loc>https://example.com/</loc></url></urlset>',
                };
            },
        },
        async () => [{ address: '93.184.216.34', family: 4 }],
        async () => ({ address: '93.184.216.34', family: 4 }),
    );

    const urls = await client.fetchSitemapUrls('https://example.com/sitemap.xml');

    assert.deepEqual(urls, ['https://example.com/']);
    assert.equal(observedUrl, 'https://example.com/sitemap.xml');
    assert.equal(observedConfig.timeout, 10_000);
    assert.equal(observedConfig.maxRedirects, 0);
    assert.equal(observedConfig.maxContentLength, MAX_SITEMAP_BYTES);
    assert.equal(observedConfig.maxBodyLength, MAX_SITEMAP_BYTES);
    assert.equal(observedConfig.responseType, 'text');
    assert.equal(observedConfig.proxy, false);
    assert.equal(typeof observedConfig.httpAgent, 'object');
    assert.equal(typeof observedConfig.httpsAgent, 'object');
});
