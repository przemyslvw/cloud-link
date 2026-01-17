import { CleanBookmarkNode } from './bookmark-utils';

export function treesAreEqual(local: CleanBookmarkNode[], remote: CleanBookmarkNode[]): boolean {
    // Simple deep equality check for now
    return JSON.stringify(local) === JSON.stringify(remote);
}

export function hasSignificantData(nodes: CleanBookmarkNode[]): boolean {
    if (!nodes || nodes.length === 0) return false;
    // Check if there are any children (meaning real bookmarks/folders)
    // We assume the root array contains the 3 main folders (Bar, Other, Mobile).
    // If any of them have children, we have data.
    return nodes.some(root => root.children && root.children.length > 0);
}

export function mergeBookmarkTrees(local: CleanBookmarkNode[], remote: CleanBookmarkNode[]): CleanBookmarkNode[] {
    // Merging logic:
    // A simplified merge strategy:
    // 1. We treat the 'id' (1,2,3) as the anchor for the root folders.
    // 2. We combine lists of children for each root.
    // 3. De-duplicate children by URL (for bookmarks) or Title (for folders).

    const merged = [...local]; // Start with local as base

    for (const remoteRoot of remote) {
        const localMatchIndex = merged.findIndex(l =>
            (l.id && l.id === remoteRoot.id) ||
            l.title === remoteRoot.title
        );

        if (localMatchIndex === -1) {
            // Not found in local, add it (unlikely for root folders but possible for custom roots if we supported them)
            merged.push(remoteRoot);
        } else {
            // Found, merge children
            if (remoteRoot.children) {
                const localRoot = merged[localMatchIndex];
                localRoot.children = mergeNodeList(localRoot.children || [], remoteRoot.children);
            }
        }
    }

    return merged;
}

function mergeNodeList(localNodes: CleanBookmarkNode[], remoteNodes: CleanBookmarkNode[]): CleanBookmarkNode[] {
    const mergedList = [...localNodes];

    for (const remoteNode of remoteNodes) {
        // Try to find a match
        // 1. By URL (if bookmark)
        // 2. By Title (if folder)
        let match: CleanBookmarkNode | undefined;

        if (remoteNode.url) {
            match = mergedList.find(l => l.url === remoteNode.url);
        } else {
            match = mergedList.find(l => !l.url && l.title === remoteNode.title);
        }

        if (!match) {
            // No match, simple add
            mergedList.push(remoteNode);
        } else {
            // Match found. If it's a folder, recursive merge.
            if (!remoteNode.url && remoteNode.children) {
                match.children = mergeNodeList(match.children || [], remoteNode.children);
            }
            // If it's a bookmark, we assume it's the same. (Could check dateAdded etc. later)
        }
    }

    return mergedList;
}
