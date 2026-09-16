import assert from 'node:assert/strict';
import test from 'node:test';
import { parseAccountName, parseLocationRef, parsePostName, parseReviewName, requireV4Parent } from '../dist/gbp/names.js';
import { GBP_REGISTRY } from '../dist/gbp/tools.js';

test('resource names accept bare ids and full resource paths', () => {
    assert.equal(parseAccountName('123'), 'accounts/123');
    assert.equal(parseAccountName('accounts/123'), 'accounts/123');
    assert.equal(parseLocationRef('456').locationName, 'locations/456');
    assert.equal(parseLocationRef('locations/456').locationName, 'locations/456');
    assert.equal(parseLocationRef('accounts/123/locations/456').v4Parent, 'accounts/123/locations/456');
    assert.equal(requireV4Parent('456', '123'), 'accounts/123/locations/456');
    assert.equal(parseReviewName('123', '456', 'reviews/789'), 'accounts/123/locations/456/reviews/789');
    assert.equal(parsePostName('accounts/123', 'locations/456', 'post1'), 'accounts/123/locations/456/localPosts/post1');
    assert.throws(() => requireV4Parent('456'), /accountId/);
});

test('gbp_update_location defaults to a closed schema and rejects extra properties', async () => {
    await assert.rejects(
        GBP_REGISTRY.dispatch('gbp_update_location', { locationId: 'locations/1', updateMask: 'title', extra: true }),
        /must NOT have additional properties/,
    );
});

test('gbp_create_post requires event or offer bodies for those topic types', async () => {
    await assert.rejects(
        GBP_REGISTRY.dispatch('gbp_create_post', {
            accountId: '1',
            locationId: '2',
            topicType: 'EVENT',
            summary: 'Hello',
        }),
        /event is required/,
    );
});
