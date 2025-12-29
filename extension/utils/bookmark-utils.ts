export interface CleanBookmarkNode {
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
            // Logic to map root folders 'Bookmarks Bar' etc. to their IDs
            // For simplicity in this destructive approach, we might assume standard structure or mapping
            // But usually chrome IDs are '1' (Bar), '2' (Other).
            // However, Firebase tree might be the array of roots.

            // If node.title is 'Bookmarks Bar', we look up ID '1'.
            if (node.title === 'Bookmarks Bar' || node.title === 'Pasek zakładek') currentParentId = '1';
            else if (node.title === 'Other Bookmarks' || node.title === 'Inne zakładki') currentParentId = '2';
            else if (node.title === 'Mobile Bookmarks' || node.title === 'Zakładki mobilne') currentParentId = '3';

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
