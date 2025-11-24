// Standalone test for merge logic
// Run with: ts-node extension/utils/sync-logic-test.ts (if available) or just node after compiling

interface BookmarkTreeNode {
    id: string;
    parentId?: string;
    index?: number;
    url?: string;
    title: string;
    children?: BookmarkTreeNode[];
}

function mergeTrees(localNodes: BookmarkTreeNode[], remoteNodes: BookmarkTreeNode[]): BookmarkTreeNode[] {
    const merged: BookmarkTreeNode[] = [];
    const usedRemoteIds = new Set<string>();

    for (const localNode of localNodes) {
        const remoteMatch = remoteNodes.find(r => {
            if (localNode.url && r.url) return localNode.url === r.url;
            if (!localNode.url && !r.url) return localNode.title === r.title;
            return false;
        });

        if (remoteMatch) {
            usedRemoteIds.add(remoteMatch.id);
            const mergedNode: BookmarkTreeNode = {
                ...localNode,
                children: mergeTrees(localNode.children || [], remoteMatch.children || [])
            };
            merged.push(mergedNode);
        } else {
            merged.push(localNode);
        }
    }

    for (const remoteNode of remoteNodes) {
        if (!usedRemoteIds.has(remoteNode.id)) {
            merged.push(remoteNode);
        }
    }

    return merged;
}

// Test Cases
const localTree: BookmarkTreeNode[] = [
    {
        id: '1', title: 'Bookmarks Bar', children: [
            { id: '11', title: 'Google', url: 'https://google.com' },
            { id: '12', title: 'Local Only', url: 'https://local.com' }
        ]
    },
    { id: '2', title: 'Other Bookmarks', children: [] }
];

const remoteTree: BookmarkTreeNode[] = [
    {
        id: 'r1', title: 'Bookmarks Bar', children: [
            { id: 'r11', title: 'Google', url: 'https://google.com' },
            { id: 'r13', title: 'Remote Only', url: 'https://remote.com' }
        ]
    },
    { id: 'r2', title: 'Other Bookmarks', children: [] }
];

console.log('Running Merge Test...');
const result = mergeTrees(localTree, remoteTree);

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
if (bar.children?.length !== 3) throw new Error(`Expected 3 children in Bar, got ${bar.children?.length}`);
if (!bar.children.find(c => c.title === 'Google')) throw new Error('Google missing');
if (!bar.children.find(c => c.title === 'Local Only')) throw new Error('Local Only missing');
if (!bar.children.find(c => c.title === 'Remote Only')) throw new Error('Remote Only missing');

console.log('Test Passed!');
