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

1.  **Clone the repository** (or download the source):
    ```bash
    git clone <repository-url>
    cd google-webmaster-mcp
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Build the project**:
    ```bash
    npm run build
    ```

## Configuration

1.  **Create a `.env` file**:
    Copy `.env.example` to `.env`:
    ```bash
    cp .env.example .env
    ```

2.  **Set up Google OAuth**:
    -   Go to your Google Cloud Console.
    -   Create OAuth 2.0 credentials (Desktop App).
    -   Download the client secret JSON or copy the Client ID and Secret.
    -   Update `.env` with your credentials:
        ```env
        GOOGLE_CLIENT_ID=your_client_id
        GOOGLE_CLIENT_SECRET=your_client_secret
        ```

3.  **Authenticate**:
    Run the authentication script to generate your `token.json`:
    ```bash
    npm run auth
    ```
    -   Click the link to authorize the app.
    -   Grant all requested permissions (GTM, GSC, Analytics).
    -   The script will save `token.json` in the root directory.

## Usage

### Running the Server

To use this with an MCP client, configure it to run the built Node.js script:

```json
{
  "mcpServers": {
    "google-webmaster": {
      "command": "node",
      "args": ["/path/to/google-webmaster-mcp/dist/index.js"],
      "env": {
        "GOOGLE_CLIENT_ID": "...",
        "GOOGLE_CLIENT_SECRET": "..."
      }
    }
  }
}
```

### Global Installation (CLI)

You can install this tool globally to use it as a command-line utility or to simplify the MCP configuration path.

1.  **Install Globally**:
    ```bash
    npm install -g .
    # Or from git:
    npm install -g git+https://github.com/ehukaimedia/google-webmasters-mcp.git
    ```

2.  **Configuration**:
    The tool stores its configuration (tokens) in `~/.config/google-webmaster-mcp/`.
    You can also place a `.env` file in that directory with your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

3.  **Authenticate**:
    Run the auth command from anywhere:
    ```bash
    google-webmaster-mcp-auth
    ```
    (This command is available globally if you installed via `npm install -g`)

### Using in Other Projects (Global Usage)

Since this is an MCP server, you don't install it *into* other repositories. Instead, you configure your AI client (Cursor, Claude Desktop, etc.) to connect to this server. Once connected, the tools are available globally, regardless of which project you have open.

#### Cursor Configuration
1.  Open Cursor Settings.
2.  Go to **Features** > **MCP**.
3.  Click **+ Add New MCP Server**.
4.  Enter the following:
    -   **Name**: `google-webmaster`
    -   **Type**: `command`
    -   **Command**: `node /absolute/path/to/google-webmaster-mcp/dist/index.js` (Replace with your actual path)
    -   **Environment Variables**: (Optional, if not set in `.env` or if you prefer explicit config)
        -   `GOOGLE_CLIENT_ID`: `...`
        -   `GOOGLE_CLIENT_SECRET`: `...`

#### Claude Desktop Configuration
Edit your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "google-webmaster": {
      "command": "node",
      "args": ["/absolute/path/to/google-webmaster-mcp/dist/index.js"],
      "env": {
        "GOOGLE_CLIENT_ID": "...",
        "GOOGLE_CLIENT_SECRET": "..."
      }
    }
  }
}
```

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
- **Tags**: `gtm_list_tags`, `gtm_create_tag`, `gtm_update_tag`, `gtm_delete_tag`
- **GA4 Helpers**: `gtm_create_ga4_event_tag`, `gtm_create_ga4_configuration_tag`
- **Variables**: `gtm_list_variables`, `gtm_create_variable`, `gtm_delete_variable`
- **Triggers**: `gtm_list_triggers`, `gtm_create_trigger`
- **Versions**: `gtm_list_versions`, `gtm_create_version`, `gtm_publish_version`
- **Validation**: `gtm_validate_workspace`

#### GSC Tools
- `gsc_list_sites`
- `gsc_analytics_query`
- `gsc_inspect_url`
- `gsc_sitemaps_submit`, `gsc_list_sitemaps`

#### Analytics Tools
- `analytics_list_account_summaries`
- `analytics_run_report`

## Development

-   **Build**: `npm run build`
-   **Dev (Watch)**: `npm run dev`
-   **Auth**: `npm run auth`

## License

ISC
