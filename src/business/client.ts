import { google } from 'googleapis';
import { getAuthClient } from '../auth/auth.js';

export class BusinessProfileClient {
    private accountManagement;
    private businessInformation;
    private authClient: any;

    constructor(authClient: any) {
        this.authClient = authClient;
        this.accountManagement = google.mybusinessaccountmanagement({ version: 'v1', auth: authClient });
        this.businessInformation = google.mybusinessbusinessinformation({ version: 'v1', auth: authClient });
    }

    static async create() {
        const authClient = await getAuthClient();
        return new BusinessProfileClient(authClient);
    }

    async listAccounts() {
        const res = await this.accountManagement.accounts.list();
        return res.data.accounts || [];
    }

    async listLocations(accountId: string) {
        // accountId should be in format "accounts/12345"
        // The API expects parent to be the account name
        const res = await this.businessInformation.accounts.locations.list({
            parent: accountId,
            readMask: 'name,title,metadata',
        });
        return res.data.locations || [];
    }

    async getLocation(name: string, readMask: string) {
        const res = await this.businessInformation.locations.get({
            name,
            readMask,
        });
        return res.data;
    }

    async getReviews(locationName: string) {
        // locationName format: "locations/12345" or "accounts/12345/locations/12345"
        // The v4 API expects "accounts/{accountId}/locations/{locationId}/reviews"
        // However, the new API returns locationName as "locations/{locationId}" usually?
        // Let's check what listLocations returns. It returns "locations/{locationId}".
        // But v4 API needs account ID.
        // We might need to extract account ID from the context or pass it in.
        // Actually, let's try to use the locationName as provided if it contains account info,
        // or construct it.

        // If locationName is just "locations/{id}", we need to find the account.
        // But for simplicity, let's assume the user passes the full resource name if possible,
        // OR we just try to hit the endpoint.
        // Wait, v4 API endpoint is: https://mybusiness.googleapis.com/v4/{parent}/reviews
        // where parent is "accounts/{accountId}/locations/{locationId}".

        // If we only have "locations/{locationId}", we can't easily construct the v4 name without looking up the location details 
        // which might contain the parent, or listing locations for an account.

        // Let's assume the input `locationName` is the full resource name required by v4, 
        // OR we require the user to pass accountId and locationId.
        // Let's make the tool take `accountId` and `locationId` to be safe, or `locationName` if it's full.

        // Actually, `listLocations` returns `name` as `locations/{locationId}`.
        // But `metadata` might contain `parent`.

        // Let's try to use the `authClient.request` to hit the v4 API.

        const url = `https://mybusiness.googleapis.com/v4/${locationName}/reviews`;
        const res = await this.authClient.request({ url });
        return res.data.reviews || [];
    }

    async replyToReview(reviewName: string, comment: string) {
        // reviewName: accounts/{accountId}/locations/{locationId}/reviews/{reviewId}
        const url = `https://mybusiness.googleapis.com/v4/${reviewName}/reply`;
        const res = await this.authClient.request({
            url,
            method: 'PUT',
            data: {
                comment
            }
        });
        return res.data;
    }

    async updateLocation(locationName: string, locationData: any, updateMask: string) {
        // locationName: locations/{locationId}
        const res = await this.businessInformation.locations.patch({
            name: locationName,
            updateMask,
            requestBody: locationData,
        });
        return res.data;
    }

    async createPost(locationName: string, postData: any) {
        // locationName: locations/{locationId}
        // API expects: accounts/{accountId}/locations/{locationId}/localPosts
        // We need to fetch the account ID first if not provided in the name, but usually locationName from listLocations includes it?
        // Actually listLocations returns "locations/{locationId}".
        // We need the account ID.
        // Wait, the v4 API for reviews used `accounts/{accId}/locations/{locId}`.
        // Let's check how we handled reviews.
        // In `getReviews`, we passed `resourceName` which was constructed in the tool handler.
        // So we should expect `locationName` here to be the full resource name: `accounts/{accId}/locations/{locId}`.

        const url = `https://mybusiness.googleapis.com/v4/${locationName}/localPosts`;
        const res = await this.authClient.request({
            url,
            method: 'POST',
            data: postData
        });
        return res.data;
    }

    async listPosts(parent: string) {
        // parent: accounts/{accountId}/locations/{locationId}
        const url = `https://mybusiness.googleapis.com/v4/${parent}/localPosts`;
        const res = await this.authClient.request({ url });
        return res.data.localPosts || [];
    }

    async deletePost(name: string) {
        // name: accounts/{accountId}/locations/{locationId}/localPosts/{postId}
        const url = `https://mybusiness.googleapis.com/v4/${name}`;
        const res = await this.authClient.request({
            url,
            method: 'DELETE'
        });
        return res.data;
    }

    async updatePost(name: string, postData: any, updateMask: string) {
        // name: accounts/{accountId}/locations/{locationId}/localPosts/{postId}
        const url = `https://mybusiness.googleapis.com/v4/${name}?updateMask=${updateMask}`;
        const res = await this.authClient.request({
            url,
            method: 'PATCH',
            data: postData
        });
        return res.data;
    }
}
