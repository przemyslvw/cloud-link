import { ref, get, set } from 'firebase/database';
import { getFirebaseDb } from './firebase-instance';
import { BookmarkTreeNode, SyncVersion } from '../../src/app/models/bookmark.model';
import { bookmarkDetector } from './bookmark-detector';

interface SyncResult {
    success: boolean;
    error?: string;
}

export class SyncEngine {
    private db;
    private isSyncing = false;

    constructor() {
        console.log('SyncEngine initialized');
        this.db = getFirebaseDb();
    }

    public async startSync(uid: string): Promise<SyncResult> {
        if (this.isSyncing) {
            console.log('Sync already in progress');
            return { success: false, error: 'Sync in progress' };
        }

        this.isSyncing = true;
        console.log('Starting sync for user:', uid);

        try {
            // 1. Get Local Tree
            const localTree = await bookmarkDetector.getBookmarkTree();
            console.log('Local Tree:', localTree);

            // 2. Get Remote Tree
            const remoteTree = await this.getRemoteTree(uid);
            console.log('Remote Tree:', remoteTree);

            // 3. Get Deleted URLs
            const storageData = await chrome.storage.local.get(['deletedUrls']);
            const deletedUrls = (storageData.deletedUrls as string[]) || [];
            console.log('Deleted URLs to process:', deletedUrls);

            // 4. Merge Trees
            const mergedTree = this.mergeTrees(localTree, remoteTree, deletedUrls);
            console.log('Merged Tree:', mergedTree);

            // 5. Save to Remote
            await this.saveRemoteTree(uid, mergedTree);

            // 6. Clear processed deleted URLs
            if (deletedUrls.length > 0) {
                await chrome.storage.local.remove(['deletedUrls']);
                console.log('Cleared processed deleted URLs');
            }

            // 7. Apply to Browser
            await this.applyTreeToBrowser(mergedTree);

            // 8. Update Sync Version
            await this.updateSyncVersion(uid);

            return { success: true };

        } catch (error: any) {
            console.error('Sync failed:', error);
            return { success: false, error: error.message };
        } finally {
            this.isSyncing = false;
        }
    }

    private async getRemoteTree(uid: string): Promise<BookmarkTreeNode[]> {
        const treeRef = ref(this.db, `bookmarks/${uid}/tree`);
        const snapshot = await get(treeRef);
        if (snapshot.exists()) {
            return snapshot.val() as BookmarkTreeNode[];
        }
        return [];
    }

    private async saveRemoteTree(uid: string, tree: BookmarkTreeNode[]) {
        const treeRef = ref(this.db, `bookmarks/${uid}/tree`);
        const sanitizedTree = this.sanitizeTree(tree);
        await set(treeRef, sanitizedTree);
        console.log('Saved tree to remote');
    }

    // Helper to remove undefined values which Firebase rejects
    private sanitizeTree(nodes: BookmarkTreeNode[]): BookmarkTreeNode[] {
        return nodes.map(node => {
            const cleanNode: any = { ...node };

            // Recursively sanitize children
            if (cleanNode.children) {
                cleanNode.children = this.sanitizeTree(cleanNode.children);
            }

            // Remove undefined keys
            Object.keys(cleanNode).forEach(key => {
                if (cleanNode[key] === undefined) {
                    delete cleanNode[key];
                }
            });

            return cleanNode;
        });
    }

    // Merge Logic: Local is primary for IDs, Remote adds missing content
    private mergeTrees(localNodes: BookmarkTreeNode[], remoteNodes: BookmarkTreeNode[], deletedUrls: string[] = []): BookmarkTreeNode[] {
        const merged: BookmarkTreeNode[] = [];
        const usedRemoteIds = new Set<string>();

        // 1. Iterate Local Nodes
        for (const localNode of localNodes) {
            // Find matching Remote Node
            // Priority: ID > URL > Title
            let remoteMatch = remoteNodes.find(r => r.id === localNode.id);

            if (!remoteMatch) {
                if (localNode.url) {
                    remoteMatch = remoteNodes.find(r => r.url === localNode.url);
                } else {
                    remoteMatch = remoteNodes.find(r => r.title === localNode.title && !r.url);
                }
            }

            if (remoteMatch) {
                // Match found! Merge them.
                usedRemoteIds.add(remoteMatch.id);

                const mergedNode: BookmarkTreeNode = {
                    ...localNode, // Keep local ID and props
                    children: this.mergeTrees(localNode.children || [], remoteMatch.children || [], deletedUrls)
                };
                merged.push(mergedNode);
            } else {
                // No match in remote, keep local
                merged.push(localNode);
            }
        }

        // 2. Add remaining Remote Nodes (that weren't matched)
        for (const remoteNode of remoteNodes) {
            if (!usedRemoteIds.has(remoteNode.id)) {
                // Check if this remote node was deleted locally
                if (remoteNode.url && deletedUrls.includes(remoteNode.url)) {
                    console.log('Skipping deleted remote bookmark:', remoteNode.title, remoteNode.url);
                    continue;
                }

                // This is a new node from remote
                merged.push(remoteNode);
            }
        }

        return merged;
    }

    private async applyTreeToBrowser(mergedTree: BookmarkTreeNode[]) {
        // We need to map the merged tree back to the browser
        // The merged tree contains:
        // - Nodes with existing Local IDs (we skip or update these)
        // - Nodes with Remote IDs (we need to create these)

        // We can't easily "update" the root nodes (Bar, Other), so we iterate their children
        // But wait, getBookmarkTree returns children of Root.
        // So mergedTree corresponds to [Bookmarks Bar, Other Bookmarks, Mobile Bookmarks] usually.

        // We need to match these top-level folders to actual Chrome roots
        const chromeRoots = await chrome.bookmarks.getTree();
        const actualRoots = chromeRoots[0].children || [];

        for (const mergedRoot of mergedTree) {
            // Find corresponding actual root
            const targetRoot = actualRoots.find(r => r.title === mergedRoot.title) || actualRoots.find(r => r.id === mergedRoot.id);

            if (targetRoot) {
                // Recursively apply children to this root
                await this.applyChildren(targetRoot.id, mergedRoot.children || []);
            } else {
                // If top level folder doesn't exist (unlikely for standard roots), create it?
                // Chrome won't let us create roots, but maybe it's a custom folder synced from elsewhere
                console.warn('Could not find local root for:', mergedRoot.title);
            }
        }
    }

    private async applyChildren(parentId: string, nodes: BookmarkTreeNode[]) {
        // Get current children of this parent to check for existence
        const currentChildren = await chrome.bookmarks.getChildren(parentId);

        for (const node of nodes) {
            // Check if this node already exists locally
            // We check by URL (link) or Title (folder)
            const existing = currentChildren.find(c => {
                if (node.url) return c.url === node.url;
                return c.title === node.title;
            });

            if (existing) {
                // Exists. If it's a folder, recurse.
                if (!node.url && node.children) {
                    await this.applyChildren(existing.id, node.children);
                }
                // If it's a link, we assume it's synced (or we could update title/url if changed)
            } else {
                // Does not exist. Create it.
                const created = await chrome.bookmarks.create({
                    parentId: parentId,
                    title: node.title,
                    url: node.url
                });

                // If it's a folder, recurse to create its children
                if (!node.url && node.children) {
                    await this.applyChildren(created.id, node.children);
                }
            }
        }
    }

    private async updateSyncVersion(uid: string) {
        const version: SyncVersion = {
            version: Date.now(),
            timestamp: Date.now(),
            source: 'browser'
        };
        await set(ref(this.db, `bookmarks/${uid}/syncVersion`), version);
    }
}

export const syncEngine = new SyncEngine();
