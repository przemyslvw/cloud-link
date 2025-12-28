import { BookmarkTreeNode } from '../../src/app/models/bookmark.model';

export class BookmarkDetector {

    constructor() {
        console.log('BookmarkDetector initialized');
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
}

export const bookmarkDetector = new BookmarkDetector();
