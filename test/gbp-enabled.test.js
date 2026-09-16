import assert from 'node:assert/strict';
import test from 'node:test';
import { isGbpEnabled } from '../dist/gbp/enabled.js';
import { getScopes, CORE_SCOPES, GBP_SCOPE } from '../dist/auth/config.js';
import { createPackageToolRegistry } from '../dist/mcp/package-tools.js';
import { mapGbpError } from '../dist/gbp/errors.js';

test('GBP stays off unless explicitly enabled', () => {
    assert.equal(isGbpEnabled({}), false);
    assert.equal(isGbpEnabled({ GBP_ENABLED: '' }), false);
    assert.equal(isGbpEnabled({ GBP_ENABLED: 'false' }), false);
    assert.equal(isGbpEnabled({ GBP_ENABLED: '0' }), false);
    assert.equal(isGbpEnabled({ GBP_ENABLED: 'true' }), true);
    assert.equal(isGbpEnabled({ GBP_ENABLED: '1' }), true);
    assert.equal(isGbpEnabled({ GBP_ENABLED: 'yes' }), true);
    assert.equal(isGbpEnabled({ GOOGLE_WEBMASTER_MCP_GBP: 'on' }), true);
});

test('OAuth scopes omit Business Profile unless GBP is enabled', () => {
    assert.deepEqual(getScopes({}), CORE_SCOPES);
    assert.equal(getScopes({}).includes(GBP_SCOPE), false);
    assert.deepEqual(getScopes({ GBP_ENABLED: 'true' }), [...CORE_SCOPES, GBP_SCOPE]);
});

test('MCP tool list hides gbp_* tools by default', () => {
    const off = createPackageToolRegistry({});
    assert.equal(off.tools.some((tool) => tool.name.startsWith('gbp_')), false);

    const on = createPackageToolRegistry({ GBP_ENABLED: 'true' });
    const gbpTools = on.tools.filter((tool) => tool.name.startsWith('gbp_')).map((tool) => tool.name);
    assert.deepEqual(gbpTools, [
        'gbp_list_accounts',
        'gbp_list_locations',
        'gbp_get_location',
        'gbp_update_location',
        'gbp_list_reviews',
        'gbp_reply_review',
        'gbp_delete_review_reply',
        'gbp_list_posts',
        'gbp_create_post',
        'gbp_delete_post',
        'gbp_get_performance',
        'gbp_list_search_keywords',
    ]);
});

test('quota-zero GBP errors tell the operator to leave the switch off', () => {
    const mapped = mapGbpError(new Error(
        "Quota exceeded for quota metric 'Requests' and limit 'Requests per minute' of service 'mybusinessaccountmanagement.googleapis.com'",
    ));
    assert.match(mapped.message, /GBP_ENABLED unset/);
});
