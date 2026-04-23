import assert from 'node:assert/strict';
import test from 'node:test';
import { ANALYTICS_REGISTRY } from '../dist/analytics/tools.js';

test('analytics_run_report rejects requests without metrics before hitting the API', async () => {
    await assert.rejects(
        ANALYTICS_REGISTRY.dispatch('analytics_run_report', {
            propertyId: '123456789',
            startDate: '2026-04-01',
            endDate: '2026-04-22',
        }),
        /Invalid arguments for analytics_run_report:/,
    );
});

test('analytics_run_report rejects empty metrics arrays', async () => {
    await assert.rejects(
        ANALYTICS_REGISTRY.dispatch('analytics_run_report', {
            propertyId: '123456789',
            startDate: '2026-04-01',
            endDate: '2026-04-22',
            metrics: [],
        }),
        /Invalid arguments for analytics_run_report:/,
    );
});
