import { Bookmark, Folder } from '../../src/app/models/bookmark.model';

interface ChromeBookmarkNode {
    id: string;
    parentId?: string;
    index?: number;
    url?: string;
    title: string;
    dateAdded?: number;
    dateGroupModified?: number;
    children?: ChromeBookmarkNode[];
}

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
        if (bookmark.url) {
            // It's a link
            const link: Partial<Bookmark> = {
                id: id,
                folderId: bookmark.parentId || 'root',
                name: bookmark.title,
                url: bookmark.url,
                createdAt: bookmark.dateAdded || Date.now(),
                updatedAt: Date.now()
            };
            this.onChangeCallback?.('created', { type: 'link', data: link });
        } else {
            // It's a folder
            const folder: Partial<Folder> = {
                id: id,
                parentId: bookmark.parentId || null,
                name: bookmark.title,
                createdAt: bookmark.dateAdded || Date.now(),
                updatedAt: Date.now(),
                children: []
            };
            this.onChangeCallback?.('created', { type: 'folder', data: folder });
        }
    }

    private handleRemoved(id: string, removeInfo: { parentId: string; index: number; node: chrome.bookmarks.BookmarkTreeNode }) {
        this.onChangeCallback?.('removed', { id, parentId: removeInfo.parentId });
    }

    private handleChanged(id: string, changeInfo: { title: string; url?: string }) {
        this.onChangeCallback?.('changed', { id, changeInfo });
    }

    private handleMoved(id: string, moveInfo: { parentId: string; index: number; oldParentId: string; oldIndex: number }) {
        // Treat move as a change
        this.onChangeCallback?.('changed', {
            id,
            changeInfo: {
                parentId: moveInfo.parentId,
                index: moveInfo.index
            }
        });
    }

    // Get all bookmarks from Chrome
    public async getAllBookmarks(): Promise<{ folders: Folder[], links: Bookmark[] }> {
        const tree = await chrome.bookmarks.getTree();
        return this.parseBookmarkTree(tree[0]);
    }

    // Parse Chrome bookmark tree to our format
    private parseBookmarkTree(node: chrome.bookmarks.BookmarkTreeNode, parentId: string | null = null): { folders: Folder[], links: Bookmark[] } {
        const folders: Folder[] = [];
        const links: Bookmark[] = [];

        if (node.children) {
            // This is a folder
            if (node.id !== '0') { // Skip root node
                const folder: Folder = {
                    id: node.id,
                    parentId: parentId,
                    name: node.title || 'Unnamed Folder',
                    createdAt: node.dateAdded || Date.now(),
                    updatedAt: node.dateGroupModified || Date.now(),
                    children: node.children.map(child => child.id)
                };
                folders.push(folder);
            }

            // Process children
            for (const child of node.children) {
                const result = this.parseBookmarkTree(child, node.id === '0' ? null : node.id);
                folders.push(...result.folders);
                links.push(...result.links);
            }
        } else if (node.url) {
            // This is a link
            const link: Bookmark = {
                id: node.id,
                folderId: parentId || 'root',
                name: node.title || 'Unnamed Link',
                url: node.url,
                createdAt: node.dateAdded || Date.now(),
                updatedAt: Date.now()
            };
            links.push(link);
        }

        return { folders, links };
    }

    // Get specific bookmark by ID
    public async getBookmarkById(id: string): Promise<chrome.bookmarks.BookmarkTreeNode | null> {
        try {
            const results = await chrome.bookmarks.get(id);
            return results[0] || null;
        } catch (error) {
            console.error('Error getting bookmark:', error);
            return null;
        }
    }

    public stopListening() {
        // Chrome doesn't provide a way to remove specific listeners
        // We can only set the callback to null
        this.onChangeCallback = undefined;
        console.log('Stopped listening for bookmark changes');
    }
}

export const bookmarkDetector = new BookmarkDetector();
