import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import test from 'node:test';

function listen(handler) {
    const server = http.createServer(handler);
    return new Promise((resolve) => {
        server.listen(0, '127.0.0.1', () => resolve(server));
    });
}

async function withServer(handler, run) {
    const server = await listen(handler);
    try {
        const { port } = server.address();
        return await run(`http://127.0.0.1:${port}/`);
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
}

function runSeoAudit(url, expectedCode = 0) {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, ['scripts/audit-cli.mjs', url], {
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        let stdout = '';
        let stderr = '';

        const timeout = setTimeout(() => {
            child.kill('SIGTERM');
            reject(new Error('seo-audit timed out'));
        }, 8_000);
        timeout.unref();

        child.stdout.on('data', (chunk) => {
            stdout += chunk;
        });
        child.stderr.on('data', (chunk) => {
            stderr += chunk;
        });
        child.on('error', reject);
        child.on('close', (code) => {
            clearTimeout(timeout);
            try {
                assert.equal(code, expectedCode, stderr || stdout);
                resolve(JSON.parse(stdout));
            } catch (error) {
                reject(error);
            }
        });
    });
}

test('seo-audit rejects unsupported response content types before parsing', async () => {
    await withServer((_, res) => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end('{"ok":true}');
    }, async (url) => {
        const output = await runSeoAudit(url, 1);
        assert.match(output.error, /Unsupported content type/);
    });
});

test('seo-audit rejects oversized responses from content-length', async () => {
    await withServer((_, res) => {
        res.writeHead(200, {
            'content-type': 'text/html',
            'content-length': String(2 * 1024 * 1024 + 1),
        });
        res.end('<!doctype html><title>small</title>');
    }, async (url) => {
        const output = await runSeoAudit(url, 1);
        assert.match(output.error, /Response too large/);
    });
});
