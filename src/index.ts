#!/usr/bin/env node
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

const server = new Server(
    {
        name: 'google-webmaster-mcp',
        version: '1.0.0',
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

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
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Google Webmaster MCP server running on stdio');
}

main().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
});
