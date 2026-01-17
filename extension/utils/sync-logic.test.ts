import { mergeBookmarkTrees, treesAreEqual, hasSignificantData } from './sync-logic';
import { CleanBookmarkNode } from './bookmark-utils';

describe('sync-logic', () => {
    describe('hasSignificantData', () => {
        it('should return false for empty or basic skeleton', () => {
            expect(hasSignificantData([])).toBe(false);
            expect(hasSignificantData([{ title: 'Pasek' }, { title: 'Inne' }] as any)).toBe(false);
        });

        it('should return true if children exist', () => {
            const input = [{ title: 'Bar', children: [{ title: 'Bookmark' }] }] as any;
            expect(hasSignificantData(input)).toBe(true);
        });
    });

    describe('mergeBookmarkTrees', () => {
        it('should merge disjoint sets of bookmarks', () => {
            // Local has A, Remote has B in same folder
            const local: CleanBookmarkNode[] = [
                {
                    id: '1', title: 'Bar', children: [
                        { title: 'Google', url: 'http://google.com' }
                    ]
                }
            ];
            const remote: CleanBookmarkNode[] = [
                {
                    id: '1', title: 'Bar', children: [
                        { title: 'Bing', url: 'http://bing.com' }
                    ]
                }
            ];

            const result = mergeBookmarkTrees(local, remote);
            expect(result).toHaveLength(1); // Bar
            expect(result[0].children).toHaveLength(2); // Google + Bing
            expect(result[0].children?.find(c => c.title === 'Google')).toBeDefined();
            expect(result[0].children?.find(c => c.title === 'Bing')).toBeDefined();
        });

        it('should deduplicate identical bookmarks by URL', () => {
            const local: CleanBookmarkNode[] = [
                { id: '1', title: 'Bar', children: [{ title: 'Google', url: 'http://google.com' }] }
            ];
            const remote: CleanBookmarkNode[] = [
                { id: '1', title: 'Bar', children: [{ title: 'Google', url: 'http://google.com' }] }
            ];

            const result = mergeBookmarkTrees(local, remote);
            expect(result[0].children).toHaveLength(1);
        });

        it('should recursively merge folders by Title', () => {
            const local: CleanBookmarkNode[] = [
                {
                    id: '1', title: 'Bar', children: [
                        { title: 'Dev', children: [{ title: 'Github', url: 'gh.com' }] }
                    ]
                }
            ];
            const remote: CleanBookmarkNode[] = [
                {
                    id: '1', title: 'Bar', children: [
                        { title: 'Dev', children: [{ title: 'Gitlab', url: 'gl.com' }] }
                    ]
                }
            ];

            const result = mergeBookmarkTrees(local, remote);
            const devFolder = result[0].children![0];

            expect(devFolder.title).toBe('Dev');
            expect(devFolder.children).toHaveLength(2);
        });

        it('should handle different root folders', () => {
            const local: CleanBookmarkNode[] = [
                { id: '1', title: 'Bar', children: [] }
            ];
            const remote: CleanBookmarkNode[] = [
                { id: '1', title: 'Bar', children: [] },
                { id: '2', title: 'Other', children: [{ title: 'Stuff' }] }
            ];

            const result = mergeBookmarkTrees(local, remote);
            expect(result).toHaveLength(2);
        });
    });

    describe('treesAreEqual', () => {
        it('should return true for identical simple trees', () => {
            const t1: CleanBookmarkNode[] = [{ title: 'A', url: 'u1' }];
            const t2: CleanBookmarkNode[] = [{ title: 'A', url: 'u1' }];
            expect(treesAreEqual(t1, t2)).toBe(true);
        });

        it('should return true for trees with different timestamps but same content', () => {
            const t1: CleanBookmarkNode[] = [{ title: 'A', url: 'u1', dateAdded: 100 }];
            const t2: CleanBookmarkNode[] = [{ title: 'A', url: 'u1', dateAdded: 200 }];
            expect(treesAreEqual(t1, t2)).toBe(true);
        });

        it('should return false for different titles', () => {
            const t1: CleanBookmarkNode[] = [{ title: 'A', url: 'u1' }];
            const t2: CleanBookmarkNode[] = [{ title: 'B', url: 'u1' }];
            expect(treesAreEqual(t1, t2)).toBe(false);
        });

        it('should return false for different structure', () => {
            const t1: CleanBookmarkNode[] = [{ title: 'Folder', children: [] }];
            const t2: CleanBookmarkNode[] = [{ title: 'Folder', children: [{ title: 'b' }] }];
            expect(treesAreEqual(t1, t2)).toBe(false);
        });
    });
});
