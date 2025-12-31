import { initializeUpstreamSync } from './upstream-sync';
import { localBookmarksChanged$ } from './bookmark-streams';
import * as bookmarkUtils from './bookmark-utils';
import { authManager } from './auth-manager';
import { getFirebaseDb } from './firebase-instance';
import { BehaviorSubject, Subject } from 'rxjs';
import { ref, update } from 'firebase/database';

// Mock dependencies
jest.mock('./bookmark-streams', () => {
    const { Subject } = require('rxjs');
    return {
        localBookmarksChanged$: new Subject()
    };
});
jest.mock('./bookmark-utils', () => ({
    getBookmarkTree: jest.fn(),
    cleanBookmarksForExport: jest.fn()
}));
jest.mock('./auth-manager', () => ({
    authManager: {
        getCurrentUser: jest.fn()
    }
}));
jest.mock('./firebase-instance', () => ({
    getFirebaseDb: jest.fn()
}));
jest.mock('firebase/database', () => ({
    ref: jest.fn(),
    update: jest.fn()
}));

describe('Upstream Sync', () => {
    let mockSubject: Subject<any>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockSubject = localBookmarksChanged$ as any as Subject<any>;

        // Setup default mocks
        // Mock a tree with a root node (Bookmarks Bar)
        (bookmarkUtils.getBookmarkTree as jest.Mock).mockResolvedValue([{
            title: 'Root',
            children: [{ title: 'Bookmarks Bar', children: [] }]
        }]);
        (bookmarkUtils.cleanBookmarksForExport as jest.Mock).mockImplementation(nodes => nodes.map(n => ({ title: n.title, sanitized: true })));
        (authManager.getCurrentUser as jest.Mock).mockResolvedValue({ uid: 'test-uid' });
        (getFirebaseDb as jest.Mock).mockReturnValue({});
        (ref as jest.Mock).mockReturnValue('mock-ref');
        (update as jest.Mock).mockResolvedValue(undefined);
    });

    it('should sync to firebase after debounce', (done) => {
        initializeUpstreamSync();

        // Emit change
        mockSubject.next('change');

        // Should not have called yet (debounce)
        expect(bookmarkUtils.getBookmarkTree).not.toHaveBeenCalled();

        // Fast forward time
        setTimeout(() => {
            expect(bookmarkUtils.getBookmarkTree).toHaveBeenCalled();
            expect(bookmarkUtils.cleanBookmarksForExport).toHaveBeenCalled();
            expect(authManager.getCurrentUser).toHaveBeenCalled();
            expect(getFirebaseDb).toHaveBeenCalled();
            // Note: ref is called multiple times now (for tree and metadata), checking generally
            expect(ref).toHaveBeenCalledWith(expect.anything(), expect.any(Object)); // ref(db)

            expect(update).toHaveBeenCalledWith('mock-ref', expect.objectContaining({
                'bookmarks/test-uid/tree': expect.arrayContaining([
                    expect.objectContaining({ title: 'Bookmarks Bar', sanitized: true })
                ]),
                'bookmarks/test-uid/metadata': expect.objectContaining({
                    source: 'extension_upstream'
                })
            }));
            done();
        }, 1100); // Wait > 1000ms
    });

    it('should trigger sync on bookmark deletion', (done) => {
        initializeUpstreamSync();

        // Simulate deletion event
        mockSubject.next('removed');

        setTimeout(() => {
            expect(bookmarkUtils.getBookmarkTree).toHaveBeenCalled();
            expect(update).toHaveBeenCalled();
            done();
        }, 1100);
    });

    it('should skip sync if user not logged in', (done) => {
        (authManager.getCurrentUser as jest.Mock).mockResolvedValue(null);

        initializeUpstreamSync();
        mockSubject.next('change');

        setTimeout(() => {
            expect(bookmarkUtils.getBookmarkTree).toHaveBeenCalled();
            expect(update).not.toHaveBeenCalled();
            done();
        }, 1100);
    });
});
