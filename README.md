# Google Webmaster MCP

Local MCP server and CLI toolkit for Google Search Console, Google Tag Manager, GA4, sitemap, and SEO audit workflows.

`google-webmaster-mcp` is intended to be project-agnostic: bring your own Google OAuth credentials, Search Console property, GTM container, and GA4 property. It does not depend on Ehukai Media websites or services.

## What It Does

- Runs an MCP stdio server with tools for GSC, GTM, and GA4.
- Provides global CLI commands for audits, sitemap submission, GTM validation, GA4 setup, and GTM publishing.
- Includes `seo-audit` for bounded technical SEO checks against a URL.
- Stores OAuth tokens in the user config directory at `~/.config/google-webmaster-mcp/`.

## Install

### From a Cold Clone

```bash
git clone https://github.com/ehukaimedia/google-webmaster-mcp.git
cd google-webmaster-mcp
npm ci
npm run build
npm install -g .
```

### From npm

After the first public npm release:

```bash
npm install -g google-webmaster-mcp
```

## Configure Authentication

Create an OAuth Desktop App in Google Cloud, then provide the client ID and secret through your environment or a local `.env` file:

```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
```

Authenticate once per Google account/profile:

```bash
google-webmaster-mcp-auth
google-webmaster-mcp-auth --profile=client_a
```

To use a saved profile for CLI or MCP runs:

```bash
export GOOGLE_TOKEN_PROFILE=client_a
```

Token files are stored under `~/.config/google-webmaster-mcp/` with private file permissions.

## Configure Project Context

Run CLI commands from a project directory with these environment variables available:

```env
GTM_ID=GTM-XXXXXXX
GSC_SITE=sc-domain:example.com
GA4_PROPERTY_ID=123456789
GA4_MID=G-XXXXXXXXXX
GTM_WORKSPACE_ID=
GOOGLE_WEBMASTER_MCP_API_KEY=
```

`GA4_PROPERTY_ID` is the numeric GA4 property ID. `GA4_MID` is the `G-` measurement ID. `GTM_WORKSPACE_ID` is optional unless the container has multiple workspaces.

## MCP Client Config

Use `npx` for portable MCP client registration:

```json
{
  "mcpServers": {
    "google-webmaster": {
      "command": "npx",
      "args": ["-y", "google-webmaster-mcp"]
    }
  }
}
```

The MCP server starts over stdio. Use `google-webmaster-mcp --help` or `google-webmaster-mcp --version` for CLI metadata; run without flags only from an MCP-compatible client.

## CLI Commands

```bash
google-webmaster-audit [GTM_ID] [GSC_SITE] [GA4_PROPERTY_ID]
google-webmaster-submit-sitemap [GSC_SITE] [SITEMAP_URL]
google-webmaster-gtm-validate [GTM_ID]
google-webmaster-setup-ga4 [GTM_ID] [GA4_MID]
google-webmaster-gtm-publish [GTM_ID] [VERSION_NOTES]
seo-audit <url> [--ai] [--pagespeed]
seo-audit --file urls.txt [--ai] [--pagespeed]
seo-audit-smart "audit localhost with AI"
```

All public commands support `--help` and `--version`.

## GTM Rate-Limit Safety

The GTM API has strict per-user quotas. Wait at least 3 minutes between GTM commands such as validate, setup, and publish. After a 429, stop and wait 3-5 minutes before one retry.

Safe sequence:

```bash
google-webmaster-audit
# wait 3 minutes
google-webmaster-gtm-validate
# wait 3 minutes
google-webmaster-setup-ga4
# wait 3 minutes
google-webmaster-gtm-validate
# wait 3 minutes
google-webmaster-gtm-publish
```

## Development

```bash
npm ci
npm run build
npm test
npm run audit:deps
npm run secrets:check
npm run pack:check
npm run smoke:tarball
```

Full local release gate:

```bash
npm run ci
```

## Security

Do not commit OAuth client secrets, `.env` files, or token files. See `SECURITY.md` for vulnerability reporting.

## License

ISC
