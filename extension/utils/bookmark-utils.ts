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
