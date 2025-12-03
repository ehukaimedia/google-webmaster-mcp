import 'dotenv/config';
import { BusinessProfileClient } from '../src/business/client.js';

async function test() {
    try {
        console.log('Initializing Business Profile Client...');
        const client = await BusinessProfileClient.create();

        console.log('\nListing Accounts...');
        const accounts = await client.listAccounts();

        if (accounts.length > 0) {
            const account = accounts[0];
            console.log(`Using Account: ${account.name} (${account.accountName})`);

            console.log('\nListing Locations...');
            const locations = await client.listLocations(account.name!);

            if (locations.length > 0) {
                const location = locations[0];
                console.log(`Using Location: ${location.name} (${location.title})`);

                // Construct resource name: accounts/{accountId}/locations/{locationId}
                const locId = location.name?.split('/')[1];
                const accId = account.name?.split('/')[1];
                const resourceName = `accounts/${accId}/locations/${locId}`;

                console.log(`\nListing Posts for ${resourceName}...`);
                const posts = await client.listPosts(resourceName);
                console.log(`Found ${posts.length} posts.`);

                // Find our test post
                const testPost = posts.find((p: any) => p.summary === 'This is a test post from the Google Webmaster MCP. Please ignore.');

                if (testPost) {
                    console.log(`\nFound Test Post: ${testPost.name}`);

                    // Update Post
                    console.log('Updating Post...');
                    try {
                        const updatedPost = await client.updatePost(
                            testPost.name,
                            { summary: 'This is an UPDATED test post from the Google Webmaster MCP.' },
                            'summary'
                        );
                        console.log('Post Updated Successfully!');
                        console.log('Updated Summary:', updatedPost.summary);
                    } catch (e: any) {
                        console.error('Update Failed:', e.message);
                    }

                    // Delete Post
                    console.log('\nDeleting Post...');
                    try {
                        await client.deletePost(testPost.name);
                        console.log('Post Deleted Successfully!');
                    } catch (e: any) {
                        console.error('Delete Failed:', e.message);
                    }

                } else {
                    console.log('Test post not found. Creating one for next time...');
                    const postData = {
                        topicType: 'STANDARD',
                        summary: 'This is a test post from the Google Webmaster MCP. Please ignore.',
                        callToAction: {
                            actionType: 'LEARN_MORE',
                            url: 'https://github.com/ehukaimedia/google-webmaster-mcp'
                        }
                    };
                    await client.createPost(resourceName, postData);
                    console.log('Created new test post.');
                }
            }
        }

    } catch (error: any) {
        console.error('Test failed:', error.message);
    }
}

test();
