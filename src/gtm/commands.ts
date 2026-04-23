import { GTMManager } from './client.js';
import { setupGa4Defaults } from './setup.js';
import type { GtmSetupSummary, GtmWorkspaceValidationResult } from './types.js';

async function createInitializedManager(gtmId: string): Promise<GTMManager> {
    const manager = new GTMManager();
    await manager.initialize();
    await manager.findContainer(gtmId);
    return manager;
}

export async function validateWorkspaceCommand(gtmId: string): Promise<GtmWorkspaceValidationResult> {
    const manager = await createInitializedManager(gtmId);
    return manager.validateWorkspace();
}

export async function publishWorkspaceCommand(gtmId: string, versionNotes: string): Promise<{ versionId: string; }> {
    const manager = await createInitializedManager(gtmId);
    const result = await manager.createVersion(`Version ${new Date().toISOString()}`, versionNotes);

    if (!result.versionId) {
        throw new Error('Failed to create version');
    }

    await manager.publishVersion(result.versionId);
    return { versionId: result.versionId };
}

export async function setupGa4Command(gtmId: string, measurementId: string): Promise<GtmSetupSummary> {
    const manager = await createInitializedManager(gtmId);
    return setupGa4Defaults(manager, measurementId);
}
