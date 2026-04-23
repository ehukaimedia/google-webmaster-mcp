import { Ajv, type ValidateFunction } from 'ajv';
import type { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';

export interface ToolDefinition<TArgs = unknown> {
    tool: Tool;
    run: (args: TArgs) => Promise<CallToolResult> | CallToolResult;
}

type AnyToolDefinition = ToolDefinition<any>;

export interface ToolRegistry {
    definitions: readonly AnyToolDefinition[];
    tools: readonly Tool[];
    dispatch: (name: string, args: unknown) => Promise<CallToolResult>;
}

export function defineTool<TArgs>(
    tool: Tool,
    run: (args: TArgs) => Promise<CallToolResult> | CallToolResult
): ToolDefinition<TArgs> {
    return { tool, run };
}

function closeObjectSchema(schema: Tool['inputSchema']): Tool['inputSchema'] {
    if (schema.type === 'object' && !('additionalProperties' in schema)) {
        return {
            ...schema,
            additionalProperties: false,
        };
    }

    return schema;
}

export function createToolRegistry(definitions: readonly AnyToolDefinition[]): ToolRegistry {
    const validatorCompiler = new Ajv({ allErrors: true, strict: false });
    const handlers = new Map<string, AnyToolDefinition['run']>();
    const validators = new Map<string, ValidateFunction>();
    const normalizedDefinitions: AnyToolDefinition[] = [];

    for (const definition of definitions) {
        if (handlers.has(definition.tool.name)) {
            throw new Error(`Duplicate tool name: ${definition.tool.name}`);
        }
        const normalizedDefinition = {
            ...definition,
            tool: {
                ...definition.tool,
                inputSchema: closeObjectSchema(definition.tool.inputSchema),
            },
        };
        normalizedDefinitions.push(normalizedDefinition);
        handlers.set(normalizedDefinition.tool.name, normalizedDefinition.run);
        validators.set(
            normalizedDefinition.tool.name,
            validatorCompiler.compile(normalizedDefinition.tool.inputSchema),
        );
    }

    return {
        definitions: normalizedDefinitions,
        tools: normalizedDefinitions.map((definition) => definition.tool),
        async dispatch(name: string, args: unknown) {
            const handler = handlers.get(name);
            const validator = validators.get(name);
            if (!handler) {
                throw new Error(`Unknown tool: ${name}`);
            }
            if (!validator) {
                throw new Error(`Missing validator for tool: ${name}`);
            }

            const normalizedArgs = args ?? {};
            if (!validator(normalizedArgs)) {
                const details = (validator.errors ?? [])
                    .map((error) => `${error.instancePath || '/'} ${error.message ?? 'is invalid'}`.trim())
                    .join('; ');
                throw new Error(`Invalid arguments for ${name}: ${details}`);
            }

            return handler(normalizedArgs);
        },
    };
}

export function combineToolRegistries(...registries: readonly ToolRegistry[]): ToolRegistry {
    return createToolRegistry(registries.flatMap((registry) => registry.definitions));
}

export function textResult(text: string): CallToolResult {
    return {
        content: [{ type: 'text', text }],
    };
}

export function jsonResult(value: unknown): CallToolResult {
    return textResult(JSON.stringify(value, null, 2));
}
