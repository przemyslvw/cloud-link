import { cleanBookmarksForExport } from './bookmark-utils';

describe('bookmark-utils', () => {
    describe('cleanBookmarksForExport', () => {
        it('should remove id, parentId, index, dateAdded', () => {
            const input: any[] = [
                {
                    id: '1',
                    parentId: '0',
                    index: 0,
                    dateAdded: 123456789,
                    title: 'Folder',
                    children: [
                        {
                            id: '2',
                            parentId: '1',
                            index: 0,
                            dateAdded: 123456790,
                            title: 'Bookmark',
                            url: 'http://example.com'
                        }
                    ]
                }
            ];

            const result = cleanBookmarksForExport(input as chrome.bookmarks.BookmarkTreeNode[]);

            expect(result).toHaveLength(1);
            expect(result[0]).toHaveProperty('id', '1'); // ID '1' is preserved (system root)
            expect(result[0]).not.toHaveProperty('parentId');
            expect(result[0]).not.toHaveProperty('index');
            expect(result[0]).toHaveProperty('dateAdded', 123456789); // dateAdded is now preserved
            expect(result[0]).toHaveProperty('title', 'Folder');
            expect(result[0].children).toHaveLength(1);

            const child = result[0].children![0];
            expect(child).toHaveProperty('id', '2'); // ID '2' is preserved (system root ID)
            expect(child).toHaveProperty('url', 'http://example.com');
        });

        it('should handle undefined children', () => {
            const input: any[] = [
                {
                    id: '1',
                    title: 'Empty Folder'
                }
            ];

            const result = cleanBookmarksForExport(input as chrome.bookmarks.BookmarkTreeNode[]);
            expect(result[0]).not.toHaveProperty('children');
        });
    });
});
