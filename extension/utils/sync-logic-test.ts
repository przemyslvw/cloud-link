// Standalone test for merge logic
// Run with: npx ts-node extension/utils/sync-logic-test.ts

interface BookmarkTreeNode {
    id: string;
    parentId?: string;
    index?: number;
    url?: string;
    title: string;
    children?: BookmarkTreeNode[];
    dateAdded?: number;
    dateGroupModified?: number;
}

// COPIED FROM sync-engine.ts (with minor adjustments for standalone)
function mergeTrees(localNodes: BookmarkTreeNode[], remoteNodes: BookmarkTreeNode[], deletedUrls: string[] = []): BookmarkTreeNode[] {
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
                children: mergeTrees(localNode.children || [], remoteMatch.children || [], deletedUrls)
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

// Test Cases
const localTree: BookmarkTreeNode[] = [
    {
        id: '1', title: 'Bookmarks Bar', children: [
            { id: '11', title: 'Google', url: 'https://google.com' }, // Match by URL (ID mismatch)
            { id: '12', title: 'Local Only', url: 'https://local.com' },
            { id: '13', title: 'Same ID', url: 'https://same.com' } // Match by ID
        ]
    },
    { id: '2', title: 'Other Bookmarks', children: [] }
];

const remoteTree: BookmarkTreeNode[] = [
    {
        id: 'r1', title: 'Bookmarks Bar', children: [
            { id: 'r11', title: 'Google', url: 'https://google.com' },
            { id: 'r13', title: 'Remote Only', url: 'https://remote.com' },
            { id: '13', title: 'Same ID', url: 'https://same.com' },
            { id: 'r14', title: 'Deleted Remote', url: 'https://deleted.com' }
        ]
    },
    { id: 'r2', title: 'Other Bookmarks', children: [] }
];

const deletedUrls = ['https://deleted.com'];

console.log('Running Merge Test...');
const result = mergeTrees(localTree, remoteTree, deletedUrls);

function printTree(nodes: BookmarkTreeNode[], indent = '') {
    nodes.forEach(node => {
        console.log(`${indent}${node.title} (${node.url || 'folder'}) [ID: ${node.id}]`);
        if (node.children) printTree(node.children, indent + '  ');
    });
}

printTree(result);

// Assertions
const bar = result.find(n => n.title === 'Bookmarks Bar');
if (!bar) throw new Error('Bookmarks Bar missing');
if (bar.children?.length !== 4) throw new Error(`Expected 4 children in Bar, got ${bar.children?.length}`);

// 1. Google (Match by URL, Local ID kept)
const google = bar.children.find(c => c.title === 'Google');
if (!google) throw new Error('Google missing');
if (google.id !== '11') throw new Error(`Google should have local ID 11, got ${google.id}`);

// 2. Local Only (Kept)
if (!bar.children.find(c => c.title === 'Local Only')) throw new Error('Local Only missing');

// 3. Same ID (Match by ID)
const sameId = bar.children.find(c => c.title === 'Same ID');
if (!sameId) throw new Error('Same ID missing');
if (sameId.id !== '13') throw new Error(`Same ID should be 13, got ${sameId.id}`);

// 4. Remote Only (Added)
if (!bar.children.find(c => c.title === 'Remote Only')) throw new Error('Remote Only missing');

// 5. Deleted Remote (Skipped)
if (bar.children.find(c => c.title === 'Deleted Remote')) throw new Error('Deleted Remote should be skipped');

console.log('Test Passed!');
