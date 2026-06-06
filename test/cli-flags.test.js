import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const version = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;

function runNode(args) {
    return spawnSync(process.execPath, args, {
        encoding: 'utf8',
        timeout: 5_000,
    });
}

test('main MCP bin prints help and version without opening stdio transport', () => {
    const help = runNode(['dist/index.js', '--help']);
    assert.equal(help.status, 0);
    assert.match(help.stdout, /Usage:/);
    assert.equal(help.stderr, '');

    const versionResult = runNode(['dist/index.js', '--version']);
    assert.equal(versionResult.status, 0);
    assert.equal(versionResult.stdout.trim(), version);
    assert.equal(versionResult.stderr, '');
});

test('public CLI bins provide deterministic help and version output', () => {
    for (const [script, helpPattern] of [
        ['dist/auth/cli.js', /Google Webmaster MCP Auth CLI/],
        ['scripts/audit-cli.mjs', /SEO Audit CLI/],
        ['scripts/smart-audit.mjs', /SEO Smart Audit CLI/],
        ['scripts/audit.js', /Google Webmaster Audit/],
        ['scripts/submit_sitemap.js', /Google Webmaster Submit Sitemap/],
        ['scripts/validate_gtm.js', /Google Webmaster GTM Validate/],
        ['scripts/publish_gtm.js', /Google Webmaster GTM Publish/],
        ['scripts/setup_ga4_tags.js', /Google Webmaster Setup GA4/],
    ]) {
        const help = runNode([script, '--help']);
        assert.equal(help.status, 0, `${script} --help failed: ${help.stderr}`);
        assert.match(help.stdout, helpPattern);

        const versionResult = runNode([script, '--version']);
        assert.equal(versionResult.status, 0, `${script} --version failed: ${versionResult.stderr}`);
        assert.equal(versionResult.stdout.trim(), version);
    }
});
