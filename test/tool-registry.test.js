import assert from 'node:assert/strict';
import test from 'node:test';
import { combineToolRegistries, createToolRegistry, defineTool, jsonResult, textResult } from '../dist/mcp/tool-registry.js';

test('createToolRegistry dispatches handlers and exposes tools', async () => {
    const registry = createToolRegistry([
        defineTool({
            name: 'example_tool',
            description: 'Example tool',
            inputSchema: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                },
                required: ['name'],
            },
        }, async ({ name }) => textResult(`hello ${name}`)),
    ]);

    assert.equal(registry.tools.length, 1);
    assert.deepEqual(await registry.dispatch('example_tool', { name: 'world' }), {
        content: [{ type: 'text', text: 'hello world' }],
    });

    await assert.rejects(
        registry.dispatch('example_tool', {}),
        /Invalid arguments for example_tool:/,
    );

    await assert.rejects(
        registry.dispatch('example_tool', { name: 'world', typo: true }),
        /must NOT have additional properties/,
    );
});

test('combineToolRegistries merges definitions and rejects duplicate names', async () => {
    const alpha = createToolRegistry([
        defineTool({
            name: 'alpha_tool',
            description: 'Alpha tool',
            inputSchema: { type: 'object', properties: {} },
        }, async () => jsonResult({ ok: true })),
    ]);

    const beta = createToolRegistry([
        defineTool({
            name: 'beta_tool',
            description: 'Beta tool',
            inputSchema: { type: 'object', properties: {} },
        }, async () => textResult('beta')),
    ]);

    const combined = combineToolRegistries(alpha, beta);
    assert.equal(combined.tools.length, 2);
    assert.deepEqual(await combined.dispatch('alpha_tool', {}), {
        content: [{ type: 'text', text: '{\n  "ok": true\n}' }],
    });

    assert.throws(() => combineToolRegistries(
        alpha,
        createToolRegistry([
            defineTool({
                name: 'alpha_tool',
                description: 'Duplicate alpha tool',
                inputSchema: { type: 'object', properties: {} },
            }, async () => textResult('duplicate')),
        ]),
    ), /Duplicate tool name: alpha_tool/);
});
