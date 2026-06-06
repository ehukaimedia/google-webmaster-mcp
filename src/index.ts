#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    ListToolsRequestSchema,
    CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { GTM_REGISTRY } from './gtm/tools.js';
import { GSC_REGISTRY } from './gsc/tools.js';
import { ANALYTICS_REGISTRY } from './analytics/tools.js';
import { combineToolRegistries, textResult } from './mcp/tool-registry.js';

const PACKAGE_VERSION = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version || '0.0.0';

const server = new Server(
    {
        name: 'google-webmaster-mcp',
        version: PACKAGE_VERSION,
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

function printHelp() {
    console.log(`Google Webmaster MCP ${PACKAGE_VERSION}

Usage:
  google-webmaster-mcp [--help] [--version]

Starts the Google Webmaster MCP server over stdio for MCP-compatible clients.

Options:
  --help, -h       Show this help message
  --version, -v    Print the package version

MCP client example:
  {
    "mcpServers": {
      "google-webmaster": {
        "command": "npx",
        "args": ["-y", "google-webmaster-mcp"]
      }
    }
  }`);
}

function handledCliFlag(args: string[]) {
    if (args.includes('--help') || args.includes('-h')) {
        printHelp();
        return true;
    }

    if (args.includes('--version') || args.includes('-v')) {
        console.log(PACKAGE_VERSION);
        return true;
    }

    return false;
}

const TOOL_REGISTRY = combineToolRegistries(
    GTM_REGISTRY,
    GSC_REGISTRY,
    ANALYTICS_REGISTRY,
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOL_REGISTRY.tools,
}));

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        return await TOOL_REGISTRY.dispatch(name, args);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { ...textResult(`Error: ${errorMessage}`), isError: true };
    }
});

async function main() {
    if (handledCliFlag(process.argv.slice(2))) {
        return;
    }

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Google Webmaster MCP server running on stdio');
}

main().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
});
