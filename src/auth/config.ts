import { isGbpEnabled } from '../gbp/enabled.js';

export const CORE_SCOPES = [
    // Google Tag Manager
    'https://www.googleapis.com/auth/tagmanager.readonly',
    'https://www.googleapis.com/auth/tagmanager.edit.containers',
    'https://www.googleapis.com/auth/tagmanager.edit.containerversions',
    'https://www.googleapis.com/auth/tagmanager.publish',

    // Google Search Console
    'https://www.googleapis.com/auth/webmasters',
    'https://www.googleapis.com/auth/webmasters.readonly',

    // Google Analytics (GA4)
    'https://www.googleapis.com/auth/analytics',
    'https://www.googleapis.com/auth/analytics.readonly',
];

export const GBP_SCOPE = 'https://www.googleapis.com/auth/business.manage';

export function getScopes(env: NodeJS.ProcessEnv = process.env): string[] {
    return isGbpEnabled(env) ? [...CORE_SCOPES, GBP_SCOPE] : [...CORE_SCOPES];
}

/** Core webmaster scopes only. GBP is added by getScopes() when GBP_ENABLED=true. */
export const SCOPES = CORE_SCOPES;

export const PORT = 3201;
export const REDIRECT_URI = `http://localhost:${PORT}/callback`;
