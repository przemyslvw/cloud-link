import { BookmarkTreeNode } from '../../src/app/models/bookmark.model';

export class BookmarkDetector {
    private onChangeCallback?: (type: 'created' | 'removed' | 'changed', data: any) => void;

    constructor() {
        console.log('BookmarkDetector initialized');
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
        // TODO: Adapt to new tree structure events if needed for real-time sync
        // For now, we rely on full re-sync or specific event handling
        this.onChangeCallback?.('created', { id, bookmark });
    }

    private async handleRemoved(id: string, removeInfo: { parentId: string; index: number; node: chrome.bookmarks.BookmarkTreeNode }) {
        this.onChangeCallback?.('removed', { id, parentId: removeInfo.parentId });

        // Track deleted URL for sync
        if (removeInfo.node && removeInfo.node.url) {
            console.log('Tracking deleted URL:', removeInfo.node.url);
            const data = await chrome.storage.local.get(['deletedUrls']);
            const deletedUrls = (data.deletedUrls as string[]) || [];
            if (!deletedUrls.includes(removeInfo.node.url)) {
                deletedUrls.push(removeInfo.node.url);
                await chrome.storage.local.set({ deletedUrls });
            }
        }
    }

    private handleChanged(id: string, changeInfo: { title: string; url?: string }) {
        this.onChangeCallback?.('changed', { id, changeInfo });
    }

    private handleMoved(id: string, moveInfo: { parentId: string; index: number; oldParentId: string; oldIndex: number }) {
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
