
interface BookmarkTreeNode {
    id: string;
    children?: BookmarkTreeNode[];
    title: string;
}

function removeNodeFromTree(nodes: BookmarkTreeNode[], nodeId: string): BookmarkTreeNode[] {
    return nodes.filter(node => {
        if (node.id === nodeId) {
            return false;
        }
        if (node.children) {
            node.children = removeNodeFromTree(node.children, nodeId);
        }
        return true;
    });
}

const mockTree: BookmarkTreeNode[] = [
    { id: '1', title: 'Start' },
    { id: '2', title: 'Delete Me' },
    {
        id: '3', title: 'Keep Me', children: [
            { id: '4', title: 'Nested Keep' },
            { id: '5', title: 'Nested Delete' }
        ]
    }
];

console.log('--- Test 1: Delete root node "2" ---');
let result = removeNodeFromTree(JSON.parse(JSON.stringify(mockTree)), '2');
console.log(JSON.stringify(result, null, 2));

console.log('--- Test 2: Delete nested node "5" ---');
result = removeNodeFromTree(JSON.parse(JSON.stringify(mockTree)), '5');
console.log(JSON.stringify(result, null, 2));

console.log('--- Test 3: Delete unknown node ---');
result = removeNodeFromTree(JSON.parse(JSON.stringify(mockTree)), '999');
console.log(JSON.stringify(result, null, 2));

console.log('--- Test 4: Delete "undefined" ---');
result = removeNodeFromTree(JSON.parse(JSON.stringify(mockTree)), undefined as any);
console.log(JSON.stringify(result, null, 2));
