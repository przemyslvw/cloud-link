import { initializeDownstreamSync } from './downstream-sync';
import { isSyncingFromRemote } from './bookmark-streams';
import * as bookmarkUtils from './bookmark-utils';
import { authManager } from './auth-manager';
import { getFirebaseDb } from './firebase-instance';
import { Subject } from 'rxjs';
import { ref, onValue, off } from 'firebase/database';

// Mock dependencies
jest.mock('./bookmark-streams', () => {
    const { BehaviorSubject } = require('rxjs');
    return {
        isSyncingFromRemote: new BehaviorSubject(false)
    };
});
jest.mock('./bookmark-utils', () => ({
    clearAllBookmarks: jest.fn(),
    createBookmarksFromTree: jest.fn()
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
    onValue: jest.fn(),
    off: jest.fn()
}));

describe('Downstream Sync', () => {
    let mockOnValueCallback: (snapshot: any) => void;

    beforeEach(() => {
        jest.clearAllMocks();
        (authManager.getCurrentUser as jest.Mock).mockResolvedValue({ uid: 'test-uid' });
        (getFirebaseDb as jest.Mock).mockReturnValue({});
        (ref as jest.Mock).mockReturnValue('mock-ref');

        // Capture the onValue callback
        (onValue as jest.Mock).mockImplementation((ref, callback) => {
            mockOnValueCallback = callback;
            return jest.fn(); // Unsubscribe function
        });

        jest.spyOn(isSyncingFromRemote, 'next');
    });

    it('should sync from firebase when data changes', async () => {
        jest.useFakeTimers();
        await initializeDownstreamSync();

        expect(onValue).toHaveBeenCalled();

        // Simulate Firebase data change
        const mockBookmarks = [{ title: 'Remote Bookmark' }];
        const snapshot = { val: () => mockBookmarks };

        // Should lock, clear, create, unlock
        mockOnValueCallback(snapshot);

        // Immediate check for lock
        expect(isSyncingFromRemote.next).toHaveBeenCalledWith(true);

        // Allow async operations in "next" to complete
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve(); // Extra ticks for safety

        expect(bookmarkUtils.clearAllBookmarks).toHaveBeenCalled();
        expect(bookmarkUtils.createBookmarksFromTree).toHaveBeenCalledWith(mockBookmarks);

        // Advance time to release lock
        jest.advanceTimersByTime(500);

        expect(isSyncingFromRemote.next).toHaveBeenCalledWith(false);

        jest.useRealTimers();
    });

    it('should handle empty firebase data', async () => {
        await initializeDownstreamSync();
        const snapshot = { val: () => null };

        await mockOnValueCallback(snapshot);

        expect(bookmarkUtils.createBookmarksFromTree).toHaveBeenCalledWith([]);
    });
});
