#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    ListToolsRequestSchema,
    CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { GTM_TOOLS, handleGtmTool } from './gtm/tools.js';
import { GSC_TOOLS, handleGscTool } from './gsc/tools.js';
import { ANALYTICS_TOOLS, handleAnalyticsTool } from './analytics/tools.js';
import { BUSINESS_TOOLS, handleBusinessTool } from './business/tools.js';

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

// Combine all tools
const ALL_TOOLS = [
    ...GTM_TOOLS,
    ...GSC_TOOLS,
    ...ANALYTICS_TOOLS,
    ...BUSINESS_TOOLS,
];

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: ALL_TOOLS,
}));

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        if (name.startsWith('gtm_')) {
            return await handleGtmTool(name, args);
        }
        if (name.startsWith('gsc_')) {
            return await handleGscTool(name, args);
        }
        if (name.startsWith('analytics_')) {
            return await handleAnalyticsTool(name, args);
        }
        if (name.startsWith('business_')) {
            return await handleBusinessTool(name, args);
        }

        throw new Error(`Unknown tool: ${name}`);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            content: [{ type: 'text', text: `Error: ${errorMessage}` }],
            isError: true,
        };
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
