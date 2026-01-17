import { isSyncingFromRemote } from './bookmark-streams';

export interface CleanBookmarkNode {
    id?: string;
    title: string;
    url?: string;
    children?: CleanBookmarkNode[];
    dateAdded?: number;
}

export function getBookmarkTree(): Promise<chrome.bookmarks.BookmarkTreeNode[]> {
    return new Promise((resolve) => {
        chrome.bookmarks.getTree((tree) => resolve(tree));
    });
}

export function sanitizeNode(node: chrome.bookmarks.BookmarkTreeNode): CleanBookmarkNode {
    const clean: CleanBookmarkNode = {
        title: node.title,
        dateAdded: node.dateAdded
    };

    // Preserve ID only for root nodes to ensure correct mapping
    // IDs 1 (Bar), 2 (Other), 3 (Mobile) are standard in Chrome
    if (['1', '2', '3'].includes(node.id)) {
        clean.id = node.id;
    }

    if (node.url) {
        clean.url = node.url;
    }

    if (node.children) {
        clean.children = node.children.map(sanitizeNode);
    }

    return clean;
}

export async function clearAllBookmarks(): Promise<void> {
    const tree = await getBookmarkTree();
    const root = tree[0];
    if (root && root.children) {
        for (const child of root.children) {
            // Iterate over 'Bookmarks Bar', 'Other Bookmarks', 'Mobile Bookmarks'
            if (child.children) {
                for (const node of child.children) {
                    await new Promise<void>((resolve) => chrome.bookmarks.removeTree(node.id, () => resolve()));
                }
            }
        }
    }
}

export async function createBookmarksFromTree(nodes: CleanBookmarkNode[], parentId?: string): Promise<void> {
    for (const node of nodes) {
        // Find correct parent ID based on root folder names if parentId is not provided
        let currentParentId = parentId;

        if (!currentParentId) {
            // Priority 1: Use ID if available (most robust)
            if (node.id === '1') currentParentId = '1';
            else if (node.id === '2') currentParentId = '2';
            else if (node.id === '3') currentParentId = '3';

            // Priority 2: Fallback to Title matching (case-insensitive)
            else {
                const lowerTitle = node.title.toLowerCase().trim();
                if (['bookmarks bar', 'pasek zakładek', 'zakładki'].includes(lowerTitle)) currentParentId = '1';
                else if (['other bookmarks', 'inne zakładki'].includes(lowerTitle)) currentParentId = '2';
                else if (['mobile bookmarks', 'zakładki mobilne'].includes(lowerTitle)) currentParentId = '3';
            }

            if (currentParentId && node.children) {
                await createBookmarksFromTree(node.children, currentParentId);
            }
            continue; // Skip creating the root folder itself, just its children
        }

        const createdNode = await new Promise<chrome.bookmarks.BookmarkTreeNode>((resolve) => {
            chrome.bookmarks.create({
                parentId: currentParentId,
                title: node.title,
                url: node.url
            }, resolve);
        });

        if (node.children) {
            await createBookmarksFromTree(node.children, createdNode.id);
        }
    }
}


export function cleanBookmarksForExport(nodes: chrome.bookmarks.BookmarkTreeNode[]): CleanBookmarkNode[] {
    return nodes.map(sanitizeNode);
}

export async function overwriteLocalBookmarks(cleanTree: CleanBookmarkNode[]): Promise<void> {
    isSyncingFromRemote.next(true);
    console.log("Starting local bookmark overwrite...");

    try {
        await clearAllBookmarks();
        await createBookmarksFromTree(cleanTree);
        console.log("Local bookmark overwrite complete.");
    } catch (error) {
        console.error("Error overwriting local bookmarks:", error);
        throw error;
    } finally {
        // Debounce releasing the lock slightly to ensure all events have fired
        setTimeout(() => {
            isSyncingFromRemote.next(false);
            console.log("Sync lock released.");
        }, 500);
    }
}
