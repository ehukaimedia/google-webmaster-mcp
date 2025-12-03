# Google Webmaster MCP

A Unified Model Context Protocol (MCP) server for managing **Google Tag Manager (GTM)**, **Google Search Console (GSC)**, and **Google Analytics (GA4)**.

This tool allows AI agents (like Claude, Cursor, etc.) to interact with your Google Webmaster tools directly, enabling automated auditing, tag management, and reporting.

## Features

### 🏷️ Google Tag Manager (GTM)
- **List & Search**: Find tags, triggers, and variables.
- **Manage Tags**: Create, update, pause, and delete tags (HTML, GA4 Event, GA4 Config).
- **Manage Variables**: Create and update Custom JavaScript and Data Layer variables.
- **Versioning**: Create versions, submit workspaces, and publish containers.
- **Validation**: Check for common issues (missing triggers, unknown variables) before publishing.

### 🔍 Google Search Console (GSC)
- **Site Management**: List all accessible properties.
- **Performance Data**: Query search analytics (clicks, impressions, CTR, position).
- **URL Inspection**: Inspect URLs for indexing status and mobile usability.
- **Sitemaps**: List, submit, and extract URLs from sitemaps.

### 📊 Google Analytics (GA4)
- **Reporting**: Run reports with custom dimensions and metrics.
- **Account Summary**: List accessible accounts and properties.

## Prerequisites

- Node.js (v18 or higher)
- A Google Cloud Project with the following APIs enabled:
  - Google Tag Manager API
  - Google Search Console API
  - Google Analytics Data API
  - Google Analytics Admin API

## Installation

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd google-webmaster-mcp
    ```

2.  **Install Globally**:
    This creates a system-wide command `google-webmaster-mcp` that works from any directory.
    ```bash
    npm install
    npm run build
    npm install -g .
    ```

## Configuration

1.  **Create a Config Directory**:
    The tool stores tokens in `~/.config/google-webmaster-mcp/`.
    ```bash
    mkdir -p ~/.config/google-webmaster-mcp
    ```

2.  **Set up Google OAuth**:
    -   Go to your Google Cloud Console.
    -   Create OAuth 2.0 credentials (Desktop App).
    -   Download the client secret JSON or copy the Client ID and Secret.
    -   Create a `.env` file in `~/.config/google-webmaster-mcp/.env`:
        ```env
        GOOGLE_CLIENT_ID=your_client_id
        GOOGLE_CLIENT_SECRET=your_client_secret
        ```

3.  **Authenticate**:
    Run the auth command from anywhere:
    ```bash
    google-webmaster-mcp-auth
    ```
    -   Click the link to authorize the app.
    -   Grant all requested permissions.
    -   The token will be saved to `~/.config/google-webmaster-mcp/token.json`.

## Usage

### MCP Client Configuration

Since you installed the tool globally, you can simply use the `google-webmaster-mcp` command.

#### Antigravity Configuration
Edit your global config at `~/.gemini/antigravity/mcp_config.json`:

```json
{
  "mcpServers": {
    "google-webmaster": {
      "command": "/Users/YOUR_USER/.nvm/versions/node/v20.19.5/bin/google-webmaster-mcp",
      "args": [],
      "env": {
        "GOOGLE_CLIENT_ID": "YOUR_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET": "YOUR_CLIENT_SECRET"
      }
    }
  }
}
```
*Note: You can find the exact path to the command by running `which google-webmaster-mcp`.*

#### Claude Desktop Configuration
Edit your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "google-webmaster": {
      "command": "google-webmaster-mcp",
      "args": [],
      "env": {
        "GOOGLE_CLIENT_ID": "...",
        "GOOGLE_CLIENT_SECRET": "..."
      }
    }
  }
}
```

#### Cursor Configuration
1.  Open Cursor Settings > **Features** > **MCP**.
2.  Click **+ Add New MCP Server**.
3.  Enter:
    -   **Name**: `google-webmaster`
    -   **Type**: `command`
    -   **Command**: `google-webmaster-mcp` (or the full path if needed)

### Multi-Repository Workflow

This tool is designed to work seamlessly across multiple projects without reconfiguration.

1.  **Global Auth**: You authenticate once (globally).
2.  **Local Context**: In each of your project repositories, create a `.env` file (or just have the info in your README) with the specific IDs for that project.

**Example Project `.env`:**
```env
GTM_ID=GTM-ABC1234
GSC_SITE=https://my-project.com
GA4_PROPERTY_ID=987654321
```

**How it works**:
When you ask your AI agent (Cursor/Claude) to "list tags" or "check indexing", the AI will:
1.  Read the `GTM_ID` or `GSC_SITE` from your current project's files.
2.  Pass that ID as an argument to the global MCP tool.
3.  The MCP tool uses your global authentication to perform the action on that specific container/site.

### Migrating from Legacy Tools

If you were previously using `gtm-manager-mcp` or `gsc-manager-mcp`, you should:

1.  **Update your MCP Configuration**:
    Replace the separate configurations for GTM and GSC with the single `google-webmaster` configuration shown above.
    *   Old tools: `gtm_list_tags`, `gsc_list_sites`, etc. are all now available under this one server.

2.  **Uninstall Legacy Packages**:
    If you installed the old tools globally, you can remove them to avoid confusion:
    ```bash
    npm uninstall -g gtm-manager-mcp gsc-manager-mcp
    ```

### Available Tools

#### GTM Tools
- **Discovery**: `gtm_list_accounts`, `gtm_list_containers`, `gtm_list_workspaces`
- **Tags**: `gtm_list_tags`, `gtm_create_tag` (supports Smart Trigger Resolution), `gtm_update_tag`, `gtm_delete_tag`
- **GA4 Helpers**: `gtm_create_ga4_event_tag`, `gtm_create_ga4_configuration_tag`
- **Variables**: `gtm_list_variables`, `gtm_create_variable`, `gtm_delete_variable`
- **Triggers**: `gtm_list_triggers`, `gtm_create_trigger`
- **Versions**: `gtm_list_versions`, `gtm_create_version`, `gtm_publish_version`
- **Validation**: `gtm_validate_workspace`

#### GSC Tools
- `gsc_list_sites`
- `gsc_get_performance_overview` (Quick Look)
- `gsc_analytics_query`
- `gsc_inspect_url`
- `gsc_sitemaps_submit`, `gsc_list_sitemaps`

#### Analytics Tools
- `analytics_list_account_summaries`
- `analytics_get_metadata` (List Dimensions/Metrics)
- `analytics_run_report`

## Development

-   **Build**: `npm run build`
-   **Dev (Watch)**: `npm run dev`
-   **Auth**: `npm run auth`

## License

ISC
