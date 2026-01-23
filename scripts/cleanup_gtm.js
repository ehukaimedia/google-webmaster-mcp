#!/usr/bin/env node
import 'dotenv/config';
import { GTMManager } from '../dist/gtm/client.js';

async function cleanup() {
    // Legacy tags to remove
    const tagsToRemove = [
        "Call Click Goal",
        "Email Click Goal",
        "Form Submit Goal"
    ];

    const gtmId = process.env.GTM_ID;
    if (!gtmId) {
        console.error("Error: GTM_ID not found in environment.");
        process.exit(1);
    }

    console.log(`Starting cleanup for GTM Container: ${gtmId}`);

    try {
        const gtm = new GTMManager();
        await gtm.initialize();

        // Find Container to set accountId/containerId internally
        await gtm.findContainer(gtmId);

        // List Tags
        const tags = await gtm.listTags();
        console.log(`Found ${tags.length} total tags.`);

        let deletedCount = 0;

        for (const tag of tags) {
            console.log(`Checking tag: "${tag.name}"`);
            if (tagsToRemove.includes(tag.name)) {
                console.log(`Deleting legacy tag: ${tag.name} (${tag.tagId})...`);
                await gtm.deleteTag(tag.tagId);
                console.log(`- Deleted.`);
                deletedCount++;
            }
        }

        if (deletedCount > 0) {
            console.log(`\nSuccessfully deleted ${deletedCount} tags.`);

            // Create Version
            console.log("Creating new GTM version...");
            const { versionId, version } = await gtm.createVersion("Cleanup: Removed Legacy UA Tags", "Automated cleanup of deprecated Universal Analytics tags.");
            console.log(`versionId: ${versionId}`);

            // Publish
            console.log(`Publishing version ${versionId}...`);
            await gtm.publishVersion(versionId);
            console.log("Published successfully! ✅");

        } else {
            console.log("\nNo legacy tags found to delete. Container is already clean.");
        }

    } catch (error) {
        console.error("Cleanup failed:", error);
        process.exit(1);
    }
}

cleanup();
