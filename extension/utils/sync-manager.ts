import { BehaviorSubject, firstValueFrom, from, Subscription } from 'rxjs';
import { SyncState, SyncStatus, ResolutionStrategy } from './sync-types';
import { getFirebaseDb } from './firebase-instance';
import { ref, get, update } from 'firebase/database';
import { authManager } from './auth-manager';
import { getBookmarkTree, cleanBookmarksForExport, overwriteLocalBookmarks } from './bookmark-utils';
import { initializeUpstreamSync } from './upstream-sync';
import { initializeDownstreamSync } from './downstream-sync';
import { hasSignificantData, mergeBookmarkTrees, treesAreEqual } from './sync-logic';

class SyncManager {
    private statusSubject = new BehaviorSubject<SyncStatus>({ state: SyncState.IDLE });
    private remoteTreeCache: any = null; // Store remote tree during conflict
    private localTreeCache: any = null;  // Store local tree during conflict

    public get status$() {
        return this.statusSubject.asObservable();
    }

    public get currentStatus() {
        return this.statusSubject.getValue();
    }

    public async start() {
        const user = await authManager.getCurrentUser();
        if (!user) {
            console.log("SyncManager: No user, staying IDLE");
            return;
        }

        this.updateStatus({ state: SyncState.SYNCING });

        try {
            // 1. Fetch Local
            const localTreeFull = await getBookmarkTree();
            const localRootChildren = localTreeFull[0]?.children || [];
            const localClean = cleanBookmarksForExport(localRootChildren);
            this.localTreeCache = localClean;

            // 2. Fetch Remote
            const db = getFirebaseDb();
            const snapshot = await get(ref(db, `bookmarks/${user.uid}/tree`));
            const remoteTree = snapshot.val();
            this.remoteTreeCache = remoteTree || [];

            // 3. Analyze
            const hasLocal = hasSignificantData(localClean);
            const hasRemote = hasSignificantData(this.remoteTreeCache);

            console.log(`SyncManager Analysis: Local=${hasLocal}, Remote=${hasRemote}`);

            if (!hasRemote && hasLocal) {
                // Scenario: Cloud Empty -> Push Local
                console.log("SyncManager: Auto-pushing to cloud");
                await this.pushToCloud(user.uid, localClean);
                this.activateRealtimeSync();

            } else if (hasRemote && !hasLocal) {
                // Scenario: Local Empty -> Pull Cloud
                console.log("SyncManager: Auto-pulling from cloud");
                await overwriteLocalBookmarks(this.remoteTreeCache);
                this.activateRealtimeSync();

            } else if (hasRemote && hasLocal) {
                // Scenario: Both exist. Check equality.
                if (treesAreEqual(localClean, this.remoteTreeCache)) {
                    console.log("SyncManager: Trees are identical. Starting sync.");
                    this.activateRealtimeSync();
                } else {
                    console.log("SyncManager: CONFLICT DETECTED.");
                    this.updateStatus({
                        state: SyncState.CONFLICT,
                        itemsLocal: this.countNodes(localClean),
                        itemsRemote: this.countNodes(this.remoteTreeCache)
                    });
                    // STOP HERE. Wait for user resolution.
                }
            } else {
                // Both empty
                console.log("SyncManager: Both empty. Starting sync.");
                this.activateRealtimeSync();
            }

        } catch (err: any) {
            console.error("SyncManager Error:", err);
            this.updateStatus({ state: SyncState.ERROR, error: err.message });
        }
    }

    public async resolveConflict(strategy: ResolutionStrategy) {
        if (this.currentStatus.state !== SyncState.CONFLICT) {
            console.warn("SyncManager: Cannot resolve conflict when not in CONFLICT state");
            return;
        }

        console.log(`SyncManager: Resolving conflict with strategy '${strategy}'`);
        const user = await authManager.getCurrentUser();
        if (!user) return; // Should not happen

        try {
            this.updateStatus({ state: SyncState.SYNCING });

            if (strategy === 'local') {
                // Overwrite Cloud with Local
                await this.pushToCloud(user.uid, this.localTreeCache);

            } else if (strategy === 'remote') {
                // Overwrite Local with Remote
                await overwriteLocalBookmarks(this.remoteTreeCache);

            } else if (strategy === 'merge') {
                // Merge logic
                const merged = mergeBookmarkTrees(this.localTreeCache, this.remoteTreeCache);
                // Apply merged to both
                await overwriteLocalBookmarks(merged); // Update local
                await this.pushToCloud(user.uid, merged); // Update cloud

            } else if (strategy === 'clear') {
                // Wipe both
                await overwriteLocalBookmarks([]); // Clear local
                await this.pushToCloud(user.uid, []); // Clear remote
            }

            console.log("SyncManager: Conflict resolved. Starting realtime sync.");
            this.activateRealtimeSync();

        } catch (err: any) {
            console.error("SyncManager: Resolution failed", err);
            this.updateStatus({ state: SyncState.ERROR, error: err.message });
        }
    }

    private async pushToCloud(uid: string, tree: any[]) {
        const db = getFirebaseDb();
        const updates: any = {};
        updates[`bookmarks/${uid}/tree`] = tree;
        updates[`bookmarks/${uid}/metadata`] = {
            timestamp: Date.now(),
            source: 'extension_init_push'
        };
        await update(ref(db), updates);
    }

    private activateRealtimeSync() {
        console.log("SyncManager: Activating Realtime Sync...");
        initializeUpstreamSync();
        initializeDownstreamSync();
        this.updateStatus({ state: SyncState.IDLE }); // Idle means "Running but waiting for changes"
    }

    private updateStatus(status: Partial<SyncStatus>) {
        this.statusSubject.next({ ...this.statusSubject.getValue(), ...status });
    }

    private countNodes(nodes: any[]): number {
        let count = 0;
        if (!nodes) return 0;
        for (const node of nodes) {
            count++;
            if (node.children) {
                count += this.countNodes(node.children);
            }
        }
        return count;
    }
}

export const syncManager = new SyncManager();
