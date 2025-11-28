import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as fs from 'fs';
import * as path from 'path';
import { SCOPES, REDIRECT_URI } from './config.js';
import 'dotenv/config';
import * as dotenv from 'dotenv';

import * as os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.config', 'google-webmaster-mcp');
if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

// Load .env from config dir if it exists
const globalEnvPath = path.join(CONFIG_DIR, '.env');
if (fs.existsSync(globalEnvPath)) {
    dotenv.config({ path: globalEnvPath });
}
const TOKEN_PATH = path.join(CONFIG_DIR, 'token.json');

export async function getAuthClient(): Promise<OAuth2Client> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env');
    }

    const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

    if (fs.existsSync(TOKEN_PATH)) {
        const token = fs.readFileSync(TOKEN_PATH, 'utf-8');
        oAuth2Client.setCredentials(JSON.parse(token));
    }

    return oAuth2Client;
}

export function saveToken(tokens: any) {
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
    console.log('Token saved to', TOKEN_PATH);
}
