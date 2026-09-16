export interface GbpLocationRef {
    accountId?: string;
    locationId: string;
    locationName: string;
    v4Parent?: string;
}

function stripPrefix(value: string, prefix: string): string {
    return value.startsWith(`${prefix}/`) ? value.slice(prefix.length + 1) : value;
}

export function parseAccountName(accountId: string): string {
    const trimmed = accountId.trim();
    if (!trimmed) {
        throw new Error('accountId is required');
    }
    return `accounts/${stripPrefix(trimmed, 'accounts')}`;
}

export function parseLocationId(locationId: string): string {
    const trimmed = locationId.trim();
    if (!trimmed) {
        throw new Error('locationId is required');
    }

    const withoutAccounts = trimmed.includes('/locations/')
        ? trimmed.slice(trimmed.lastIndexOf('/locations/') + '/locations/'.length)
        : stripPrefix(trimmed, 'locations');

    if (!withoutAccounts || withoutAccounts.includes('/')) {
        throw new Error('locationId must be a location id or locations/{id}');
    }

    return withoutAccounts;
}

export function parseLocationRef(locationId: string, accountId?: string): GbpLocationRef {
    const trimmed = locationId.trim();
    let parsedAccount = accountId ? stripPrefix(accountId.trim(), 'accounts') : undefined;
    let parsedLocation = parseLocationId(trimmed);

    const accountMatch = trimmed.match(/^accounts\/([^/]+)\/locations\/([^/]+)$/);
    if (accountMatch) {
        parsedAccount = accountMatch[1];
        parsedLocation = accountMatch[2];
    }

    return {
        accountId: parsedAccount,
        locationId: parsedLocation,
        locationName: `locations/${parsedLocation}`,
        v4Parent: parsedAccount ? `accounts/${parsedAccount}/locations/${parsedLocation}` : undefined,
    };
}

export function requireV4Parent(locationId: string, accountId?: string): string {
    const ref = parseLocationRef(locationId, accountId);
    if (!ref.v4Parent) {
        throw new Error('Reviews and posts require accountId plus locationId (accounts/{accountId}/locations/{locationId})');
    }
    return ref.v4Parent;
}

export function parseReviewName(accountId: string, locationId: string, reviewId: string): string {
    const parent = requireV4Parent(locationId, accountId);
    return `${parent}/reviews/${stripPrefix(reviewId.trim(), 'reviews')}`;
}

export function parsePostName(accountId: string, locationId: string, postId: string): string {
    const parent = requireV4Parent(locationId, accountId);
    return `${parent}/localPosts/${stripPrefix(postId.trim(), 'localPosts')}`;
}
