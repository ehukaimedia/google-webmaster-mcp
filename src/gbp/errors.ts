function errorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}

export function mapGbpError(error: unknown): Error {
    const message = errorMessage(error);

    if (/Quota exceeded|Requests per minute/i.test(message)) {
        return new Error(
            'GBP API access is not approved for this Cloud project (quota 0 QPM). Leave GBP_ENABLED unset until Google approves the access request.',
        );
    }

    if (/has not been used|SERVICE_DISABLED|is disabled/i.test(message)) {
        return new Error(
            `A Google Business Profile API is disabled on this Cloud project. Enable the Business Profile APIs, then retry. ${message}`,
        );
    }

    if (/Error 404|Not Found/i.test(message) && /mybusiness\.googleapis\.com\/v4/i.test(message)) {
        return new Error(
            'Google My Business API v4 is not available on this Cloud project. Reviews and posts stay off until Google grants that API.',
        );
    }

    return error instanceof Error ? error : new Error(message);
}

export async function withGbpErrors<T>(operation: () => Promise<T>): Promise<T> {
    try {
        return await operation();
    } catch (error) {
        throw mapGbpError(error);
    }
}
