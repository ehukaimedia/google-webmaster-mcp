#!/usr/bin/env node
import { google } from 'googleapis';
import * as http from 'http';
import * as url from 'url';
import { exec } from 'child_process';
import { SCOPES, PORT, REDIRECT_URI } from './config.js';
import { saveToken } from './auth.js';
import 'dotenv/config';

async function main() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        console.error('Error: Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env');
        process.exit(1);
    }

    const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent', // Force consent to ensure we get a refresh token
    });

    console.log(`\nStarting local server on port ${PORT}...`);
    console.log('Please visit the following URL to authorize the app:');
    console.log(`\n${authUrl}\n`);

    // Try to open the URL automatically
    const start = (process.platform == 'darwin' ? 'open' : process.platform == 'win32' ? 'start' : 'xdg-open');
    exec(`${start} "${authUrl}"`);

    const server = http.createServer(async (req, res) => {
        if (req.url?.startsWith('/callback')) {
            const qs = new url.URL(req.url, `http://localhost:${PORT}`).searchParams;
            const code = qs.get('code');

            if (code) {
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end('<h1>Authentication successful!</h1><p>You can close this tab.</p>');
                try {
                    const { tokens } = await oAuth2Client.getToken(code);
                    oAuth2Client.setCredentials(tokens);
                    saveToken(tokens);
                    console.log('Setup complete.');
                } catch (err) {
                    console.error('Error retrieving access token', err);
                } finally {
                    server.close();
                    process.exit(0);
                }
            } else {
                res.end('Authentication failed. No code found.');
                server.close();
                process.exit(1);
            }
        } else {
            res.writeHead(404);
            res.end('Not found');
        }
    });

    server.listen(PORT, () => {
        console.log(`Listening for callback at ${REDIRECT_URI}`);
    });
}

main().catch(console.error);
