import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as fs from 'fs';
import * as path from 'path';
import { SCOPES, REDIRECT_URI } from './config.js';
import * as dotenv from 'dotenv';
import * as os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.config', 'google-webmaster-mcp');
if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
}
try {
    fs.chmodSync(CONFIG_DIR, 0o700);
} catch {
    // Best effort on platforms/filesystems that do not support POSIX modes.
}

// Load .env files while silencing dotenv's stdout noise
const withSilencedLogs = (fn: () => void) => {
    const originalLog = console.log;
    console.log = () => { };
    try {
        fn();
    } finally {
        console.log = originalLog;
    }
};

withSilencedLogs(() => dotenv.config());

// Load .env from config dir if it exists
const globalEnvPath = path.join(CONFIG_DIR, '.env');
if (fs.existsSync(globalEnvPath)) {
    withSilencedLogs(() => dotenv.config({ path: globalEnvPath }));
}

export function getTokenPath(profile: string = 'default'): string {
    const safeProfile = normalizeTokenProfile(profile);
    const filename = safeProfile === 'default' ? 'token.json' : `token_${safeProfile}.json`;
    return path.join(CONFIG_DIR, filename);
}

export function normalizeTokenProfile(profile: string = 'default'): string {
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(profile)) {
        throw new Error('Token profile must use only letters, numbers, underscores, or hyphens');
    }
    return profile;
}

export async function getAuthClient(): Promise<OAuth2Client> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    // Default to 'default' profile if env var not set
    const profile = process.env.GOOGLE_TOKEN_PROFILE || 'default';

    if (!clientId || !clientSecret) {
        throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env');
    }

    const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
    const tokenPath = getTokenPath(profile);

    if (fs.existsSync(tokenPath)) {
        const token = fs.readFileSync(tokenPath, 'utf-8');
        oAuth2Client.setCredentials(JSON.parse(token));
    } else {
        // If profile is specified but not found, maybe warn? 
        // For now, silent fail means "not authenticated" which is expected if token missing.
        if (profile !== 'default') {
            console.warn(`Warning: No token found for profile '${profile}' at ${tokenPath}`);
        }
    }

    return oAuth2Client;
}

export function saveToken(tokens: any, profile: string = 'default') {
    const tokenPath = getTokenPath(profile);
    fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2), { mode: 0o600 });
    try {
        fs.chmodSync(tokenPath, 0o600);
    } catch {
        // Best effort on platforms/filesystems that do not support POSIX modes.
    }
    console.log(`Token saved for profile '${profile}' to`, tokenPath);
}
