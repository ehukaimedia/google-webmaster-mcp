import { combineToolRegistries, type ToolRegistry } from './tool-registry.js';
import { GTM_REGISTRY } from '../gtm/tools.js';
import { GSC_REGISTRY } from '../gsc/tools.js';
import { ANALYTICS_REGISTRY } from '../analytics/tools.js';
import { GBP_REGISTRY } from '../gbp/tools.js';
import { isGbpEnabled } from '../gbp/enabled.js';

export function createPackageToolRegistry(env: NodeJS.ProcessEnv = process.env): ToolRegistry {
    const registries = [GTM_REGISTRY, GSC_REGISTRY, ANALYTICS_REGISTRY];
    if (isGbpEnabled(env)) {
        registries.push(GBP_REGISTRY);
    }
    return combineToolRegistries(...registries);
}
