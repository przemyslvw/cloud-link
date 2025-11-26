import { BookmarkTreeNode } from '../../src/app/models/bookmark.model';

export class BookmarkDetector {
    private onChangeCallback?: (type: 'created' | 'removed' | 'changed', data: any) => void;

    private mirror: Map<string, BookmarkTreeNode> = new Map();

    constructor() {
        console.log('BookmarkDetector initialized');
        this.loadMirror();
    }

    private async loadMirror() {
        const data = await chrome.storage.local.get(['bookmarkMirror']);
        if (data.bookmarkMirror) {
            this.mirror = new Map(JSON.parse(data.bookmarkMirror as string));
        } else {
            // Initial load - populate mirror from current state
            const tree = await this.getBookmarkTree();
            this.flattenTreeToMirror(tree);
            this.saveMirror();
        }
    }

    private async saveMirror() {
        await chrome.storage.local.set({
            bookmarkMirror: JSON.stringify(Array.from(this.mirror.entries()))
        });
    }

    private flattenTreeToMirror(nodes: BookmarkTreeNode[]) {
        for (const node of nodes) {
            this.mirror.set(node.id, node);
            if (node.children) {
                this.flattenTreeToMirror(node.children);
            }
        }
    }

    public startListening(callback: (type: 'created' | 'removed' | 'changed', data: any) => void) {
        console.log('Listening for bookmark changes...');
        this.onChangeCallback = callback;

        // Listen for bookmark creation
        chrome.bookmarks.onCreated.addListener((id, bookmark) => {
            console.log('Bookmark created:', id, bookmark);
            this.handleCreated(id, bookmark);
        });

        // Listen for bookmark removal
        chrome.bookmarks.onRemoved.addListener((id, removeInfo) => {
            console.log('Bookmark removed:', id, removeInfo);
            this.handleRemoved(id, removeInfo);
        });

        // Listen for bookmark changes (title, URL)
        chrome.bookmarks.onChanged.addListener((id, changeInfo) => {
            console.log('Bookmark changed:', id, changeInfo);
            this.handleChanged(id, changeInfo);
        });

        // Listen for bookmark moves
        chrome.bookmarks.onMoved.addListener((id, moveInfo) => {
            console.log('Bookmark moved:', id, moveInfo);
            this.handleMoved(id, moveInfo);
        });
    }

    private handleCreated(id: string, bookmark: chrome.bookmarks.BookmarkTreeNode) {
        // Update Mirror
        const modelNode: BookmarkTreeNode = {
            id: bookmark.id,
            parentId: bookmark.parentId,
            index: bookmark.index,
            title: bookmark.title,
            url: bookmark.url,
            dateAdded: bookmark.dateAdded,
            dateGroupModified: bookmark.dateGroupModified
        };
        this.mirror.set(id, modelNode);
        this.saveMirror();

        this.onChangeCallback?.('created', { id, bookmark });
    }

    private async handleRemoved(id: string, removeInfo: { parentId: string; index: number; node: chrome.bookmarks.BookmarkTreeNode }) {
        // Get deleted node from Mirror BEFORE removing it
        const deletedNode = this.mirror.get(id);

        if (deletedNode) {
            console.log('Detected removal of:', deletedNode.title, deletedNode.url);

            // Track deleted URL/ID for sync
            const data = await chrome.storage.local.get(['deletedUrls']);
            const deletedUrls = (data.deletedUrls as string[]) || [];

            // We track URL for links, and maybe ID for folders? 
            // For now, let's stick to URL for content, as IDs might differ across devices if not synced perfectly yet.
            // But wait, user requirement 2 says "should remove that bookmark in database".
            // If we only track URL, we handle links. Folders are harder.

            if (deletedNode.url && !deletedUrls.includes(deletedNode.url)) {
                deletedUrls.push(deletedNode.url);
                await chrome.storage.local.set({ deletedUrls });
            }

            // Remove from Mirror
            this.mirror.delete(id);
            // Also need to remove children from mirror if it was a folder
            // But map doesn't support recursive delete easily without traversing.
            // Since we flatten, we might leave orphans in mirror if we don't be careful.
            // Ideally we should traverse the deleted node's children if available (but removeInfo.node is recursive in Chrome API?)
            // Chrome API removeInfo.node is only available since Chrome 59, let's check if it has children.
            if (removeInfo.node && removeInfo.node.children) {
                this.removeChildrenFromMirror(removeInfo.node.children);
            }

            this.saveMirror();
        } else {
            console.warn('Removed node not found in mirror:', id);
        }

        this.onChangeCallback?.('removed', { id, parentId: removeInfo.parentId });
    }

    private removeChildrenFromMirror(nodes: chrome.bookmarks.BookmarkTreeNode[]) {
        for (const node of nodes) {
            this.mirror.delete(node.id);
            if (node.children) {
                this.removeChildrenFromMirror(node.children);
            }
        }
    }

    private handleChanged(id: string, changeInfo: { title: string; url?: string }) {
        const node = this.mirror.get(id);
        if (node) {
            node.title = changeInfo.title;
            if (changeInfo.url) node.url = changeInfo.url;
            this.mirror.set(id, node);
            this.saveMirror();
        }
        this.onChangeCallback?.('changed', { id, changeInfo });
    }

    private handleMoved(id: string, moveInfo: { parentId: string; index: number; oldParentId: string; oldIndex: number }) {
        const node = this.mirror.get(id);
        if (node) {
            node.parentId = moveInfo.parentId;
            node.index = moveInfo.index;
            this.mirror.set(id, node);
            this.saveMirror();
        }

        this.onChangeCallback?.('changed', {
            id,
            changeInfo: {
                parentId: moveInfo.parentId,
                index: moveInfo.index
            }
        });
    }

    // Get all bookmarks from Chrome as a Tree
    public async getBookmarkTree(): Promise<BookmarkTreeNode[]> {
        const tree = await chrome.bookmarks.getTree();
        // The root node (id: '0') usually contains 'Bookmarks Bar', 'Other Bookmarks', etc.
        // We want to return the children of the root node to be consistent
        return this.mapChromeTreeToModel(tree[0].children || []);
    }

    private mapChromeTreeToModel(nodes: chrome.bookmarks.BookmarkTreeNode[]): BookmarkTreeNode[] {
        return nodes.map(node => {
            const modelNode: BookmarkTreeNode = {
                id: node.id,
                parentId: node.parentId,
                index: node.index,
                title: node.title,
                url: node.url,
                dateAdded: node.dateAdded,
                dateGroupModified: node.dateGroupModified,
                children: node.children ? this.mapChromeTreeToModel(node.children) : undefined
            };
            return modelNode;
        });
    }

    // Helper to clear all bookmarks (use with caution!)
    public async clearAllBookmarks() {
        const tree = await chrome.bookmarks.getTree();
        const rootChildren = tree[0].children || [];
        for (const child of rootChildren) {
            // We can't remove the root folders (Bar, Other, Mobile), but we can empty them
            if (child.children) {
                for (const subChild of child.children) {
                    await chrome.bookmarks.removeTree(subChild.id);
                }
            }
        }
    }

    public stopListening() {
        this.onChangeCallback = undefined;
        console.log('Stopped listening for bookmark changes');
    }
}

export const bookmarkDetector = new BookmarkDetector();
