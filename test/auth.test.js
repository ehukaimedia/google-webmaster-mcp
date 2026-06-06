import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

test('auth token paths are profile-safe and written with private permissions', async () => {
    const originalHome = process.env.HOME;
    const home = mkdtempSync(path.join(tmpdir(), 'gwmcp-auth-'));
    process.env.HOME = home;

    try {
        const auth = await import(`../dist/auth/auth.js?home=${Date.now()}`);
        const configDir = path.join(home, '.config', 'google-webmaster-mcp');

        assert.equal(auth.getTokenPath(), path.join(configDir, 'token.json'));
        assert.equal(auth.getTokenPath('client_a'), path.join(configDir, 'token_client_a.json'));
        assert.throws(() => auth.getTokenPath('../escape'), /Token profile/);
        assert.throws(() => auth.normalizeTokenProfile('client/a'), /Token profile/);

        auth.saveToken({ refresh_token: 'redacted' }, 'client_a');

        assert.equal(statSync(configDir).mode & 0o777, 0o700);
        assert.equal(statSync(path.join(configDir, 'token_client_a.json')).mode & 0o777, 0o600);
    } finally {
        if (originalHome === undefined) {
            delete process.env.HOME;
        } else {
            process.env.HOME = originalHome;
        }
        rmSync(home, { recursive: true, force: true });
    }
});
