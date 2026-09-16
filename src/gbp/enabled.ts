const ENABLED_PATTERN = /^(1|true|yes|on)$/i;

export function isGbpEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
    const raw = env.GBP_ENABLED ?? env.GOOGLE_WEBMASTER_MCP_GBP ?? '';
    return ENABLED_PATTERN.test(String(raw).trim());
}
