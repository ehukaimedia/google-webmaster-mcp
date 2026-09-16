import { getAuthClient } from '../auth/auth.js';
import { withGbpErrors } from './errors.js';

async function gbpV4Request<T>(url: string, method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET', data?: unknown): Promise<T> {
    return withGbpErrors(async () => {
        const auth = await getAuthClient();
        const res = await auth.request({
            url,
            method,
            data,
        });
        return res.data as T;
    });
}

export async function listReviews(parent: string, pageToken?: string) {
    const params = new URLSearchParams();
    params.set('pageSize', '50');
    if (pageToken) {
        params.set('pageToken', pageToken);
    }
    return gbpV4Request<{ reviews?: unknown[]; nextPageToken?: string }>(
        `https://mybusiness.googleapis.com/v4/${parent}/reviews?${params.toString()}`,
    );
}

export async function replyToReview(reviewName: string, comment: string) {
    return gbpV4Request(
        `https://mybusiness.googleapis.com/v4/${reviewName}/reply`,
        'PUT',
        { comment },
    );
}

export async function deleteReviewReply(reviewName: string) {
    return gbpV4Request(
        `https://mybusiness.googleapis.com/v4/${reviewName}/reply`,
        'DELETE',
    );
}

export async function listPosts(parent: string, pageToken?: string) {
    const params = new URLSearchParams();
    params.set('pageSize', '50');
    if (pageToken) {
        params.set('pageToken', pageToken);
    }
    return gbpV4Request<{ localPosts?: unknown[]; nextPageToken?: string }>(
        `https://mybusiness.googleapis.com/v4/${parent}/localPosts?${params.toString()}`,
    );
}

export async function createPost(parent: string, postData: Record<string, unknown>) {
    return gbpV4Request(
        `https://mybusiness.googleapis.com/v4/${parent}/localPosts`,
        'POST',
        postData,
    );
}

export async function deletePost(postName: string) {
    return gbpV4Request(
        `https://mybusiness.googleapis.com/v4/${postName}`,
        'DELETE',
    );
}
