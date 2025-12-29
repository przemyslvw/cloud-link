import { initializeUpstreamSync } from './upstream-sync';
import { localBookmarksChanged$ } from './bookmark-streams';
import * as bookmarkUtils from './bookmark-utils';
import { authManager } from './auth-manager';
import { getFirebaseDb } from './firebase-instance';
import { BehaviorSubject, Subject } from 'rxjs';
import { ref, set } from 'firebase/database';

// Mock dependencies
jest.mock('./bookmark-streams', () => {
    const { Subject } = require('rxjs');
    return {
        localBookmarksChanged$: new Subject()
    };
});
jest.mock('./bookmark-utils', () => ({
    getBookmarkTree: jest.fn(),
    sanitizeNode: jest.fn()
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
    set: jest.fn()
}));

describe('Upstream Sync', () => {
    let mockSubject: Subject<any>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockSubject = localBookmarksChanged$ as any as Subject<any>;

        // Setup default mocks
        (bookmarkUtils.getBookmarkTree as jest.Mock).mockResolvedValue([{ title: 'Root' }]);
        (bookmarkUtils.sanitizeNode as jest.Mock).mockImplementation(node => ({ title: node.title, sanitized: true }));
        (authManager.getCurrentUser as jest.Mock).mockResolvedValue({ uid: 'test-uid' });
        (getFirebaseDb as jest.Mock).mockReturnValue({});
        (ref as jest.Mock).mockReturnValue('mock-ref');
        (set as jest.Mock).mockResolvedValue(undefined);
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
            expect(bookmarkUtils.sanitizeNode).toHaveBeenCalled();
            expect(authManager.getCurrentUser).toHaveBeenCalled();
            expect(getFirebaseDb).toHaveBeenCalled();
            expect(ref).toHaveBeenCalledWith(expect.anything(), 'users/test-uid');
            // Check if set was called with sanitized array and timestamp
            expect(set).toHaveBeenCalledWith('mock-ref', expect.objectContaining({
                bookmarks: expect.arrayContaining([
                    expect.objectContaining({ title: 'Root', sanitized: true })
                ]),
                lastUpdated: expect.any(Number)
            }));
            done();
        }, 1100); // Wait > 1000ms
    });

    it('should skip sync if user not logged in', (done) => {
        (authManager.getCurrentUser as jest.Mock).mockResolvedValue(null);

        initializeUpstreamSync();
        mockSubject.next('change');

        setTimeout(() => {
            expect(bookmarkUtils.getBookmarkTree).toHaveBeenCalled();
            expect(set).not.toHaveBeenCalled();
            done();
        }, 1100);
    });
});
