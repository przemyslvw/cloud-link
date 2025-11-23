import { ref, get, set, update } from 'firebase/database';
import { getFirebaseDb } from './firebase-instance';
import { Bookmark, Folder } from '../../src/app/models/bookmark.model';
import { bookmarkDetector } from './bookmark-detector';

interface SyncVersion {
    version: number;
    timestamp: number;
    source: 'web' | 'browser' | 'import';
}

interface SyncResult {
    success: boolean;
    pulled: number;
    pushed: number;
    conflicts: number;
    errors: string[];
}

export class SyncEngine {
    private db;
    private isSyncing = false;
    private retryCount = 0;
    private maxRetries = 3;

    constructor() {
        console.log('SyncEngine initialized');
        this.db = getFirebaseDb();
    }

    public async startSync(uid: string): Promise<SyncResult> {
        if (this.isSyncing) {
            return {
                success: false,
                pulled: 0,
                pushed: 0,
                conflicts: 0,
                errors: ['Sync already in progress']
            };
        }

        this.isSyncing = true;
        console.log('Starting sync for user:', uid);

        try {
            const result = await this.performSync(uid);
            this.retryCount = 0;
            return result;
        } catch (error: any) {
            console.error('Sync error:', error);

            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                const delay = Math.pow(2, this.retryCount) * 1000;
                console.log(`Retrying sync in ${delay}ms (attempt ${this.retryCount}/${this.maxRetries})`);

                await new Promise(resolve => setTimeout(resolve, delay));
                return this.startSync(uid);
            }

            return {
                success: false,
                pulled: 0,
                pushed: 0,
                conflicts: 0,
                errors: [error.message || 'Unknown error']
            };
        } finally {
            this.isSyncing = false;
        }
    }

    private async performSync(uid: string): Promise<SyncResult> {
        const result: SyncResult = {
            success: true,
            pulled: 0,
            pushed: 0,
            conflicts: 0,
            errors: []
        };

        const localData = await bookmarkDetector.getAllBookmarks();
        console.log('Local bookmarks:', localData);

        const remoteData = await this.getRemoteBookmarks(uid);
        console.log('Remote bookmarks:', remoteData);

        const localVersion = await this.getLocalSyncVersion();
        const remoteVersion = await this.getRemoteSyncVersion(uid);
        console.log('Versions - Local:', localVersion, 'Remote:', remoteVersion);

        if (remoteVersion.version > localVersion.version) {
            console.log('Remote is newer, pulling from database...');
            const pullCount = await this.pullFromRemote(uid, remoteData);
            result.pulled = pullCount;
        } else if (localVersion.version > remoteVersion.version || this.hasLocalChanges(localData, remoteData)) {
            console.log('Local has changes, pushing to database...');
            const pushResult = await this.pushToRemote(uid, localData, remoteData);
            result.pushed = pushResult.pushed;
            result.conflicts = pushResult.conflicts;
        } else {
            console.log('Already in sync, no changes needed');
        }

        const newVersion = Math.max(localVersion.version, remoteVersion.version) + 1;
        await this.updateSyncVersion(uid, newVersion);

        return result;
    }

    private async getRemoteBookmarks(uid: string): Promise<{ folders: Folder[], links: Bookmark[] }> {
        const foldersRef = ref(this.db, `bookmarks/${uid}/folders`);
        const linksRef = ref(this.db, `bookmarks/${uid}/links`);

        const [foldersSnapshot, linksSnapshot] = await Promise.all([
            get(foldersRef),
            get(linksRef)
        ]);

        const folders: Folder[] = [];
        const links: Bookmark[] = [];

        if (foldersSnapshot.exists()) {
            const foldersData = foldersSnapshot.val();
            Object.values(foldersData).forEach((folder: any) => {
                if (folder && folder.id) {
                    folders.push(folder);
                }
            });
        }

        if (linksSnapshot.exists()) {
            const linksData = linksSnapshot.val();
            Object.values(linksData).forEach((link: any) => {
                if (link && link.id) {
                    links.push(link);
                }
            });
        }

        return { folders, links };
    }

    private async getLocalSyncVersion(): Promise<SyncVersion> {
        const data = await chrome.storage.local.get(['syncVersion']);
        return (data.syncVersion as SyncVersion) || { version: 0, timestamp: 0, source: 'browser' };
    }

    private async getRemoteSyncVersion(uid: string): Promise<SyncVersion> {
        const versionRef = ref(this.db, `bookmarks/${uid}/syncVersion`);
        const snapshot = await get(versionRef);
        return snapshot.exists() ? snapshot.val() : { version: 0, timestamp: 0, source: 'web' };
    }

    private hasLocalChanges(local: { folders: Folder[], links: Bookmark[] }, remote: { folders: Folder[], links: Bookmark[] }): boolean {
        return local.folders.length !== remote.folders.length ||
            local.links.length !== remote.links.length;
    }

    private async pullFromRemote(uid: string, remoteData: { folders: Folder[], links: Bookmark[] }): Promise<number> {
        console.log('Pull from remote not yet implemented');
        return 0;
    }

    private async pushToRemote(
        uid: string,
        localData: { folders: Folder[], links: Bookmark[] },
        remoteData: { folders: Folder[], links: Bookmark[] }
    ): Promise<{ pushed: number, conflicts: number }> {
        let pushed = 0;
        let conflicts = 0;

        const updates: any = {};

        for (const folder of localData.folders) {
            const remoteFolderExists = remoteData.folders.find(f => f.id === folder.id);

            if (!remoteFolderExists) {
                updates[`bookmarks/${uid}/folders/${folder.id}`] = folder;
                pushed++;
            } else if (folder.updatedAt > remoteFolderExists.updatedAt) {
                updates[`bookmarks/${uid}/folders/${folder.id}`] = folder;
                pushed++;
                conflicts++;
            }
        }

        for (const link of localData.links) {
            const remoteLinkExists = remoteData.links.find(l => l.id === link.id);

            if (!remoteLinkExists) {
                updates[`bookmarks/${uid}/links/${link.id}`] = link;
                pushed++;
            } else if (link.updatedAt > remoteLinkExists.updatedAt) {
                updates[`bookmarks/${uid}/links/${link.id}`] = link;
                pushed++;
                conflicts++;
            }
        }

        if (Object.keys(updates).length > 0) {
            await update(ref(this.db), updates);
            console.log(`Pushed ${pushed} items (${conflicts} conflicts resolved)`);
        }

        return { pushed, conflicts };
    }

    private async updateSyncVersion(uid: string, newVersion: number): Promise<void> {
        const timestamp = Date.now();
        const syncVersion: SyncVersion = {
            version: newVersion,
            timestamp,
            source: 'browser'
        };

        await set(ref(this.db, `bookmarks/${uid}/syncVersion`), syncVersion);
        await chrome.storage.local.set({ syncVersion });

        console.log('Sync version updated to:', newVersion);
    }

    public stopSync() {
        this.isSyncing = false;
        console.log('Sync stopped');
    }
}

export const syncEngine = new SyncEngine();
