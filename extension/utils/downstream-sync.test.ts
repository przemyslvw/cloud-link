import { initializeDownstreamSync } from './downstream-sync';
import { isSyncingFromRemote } from './bookmark-streams';
import * as bookmarkUtils from './bookmark-utils';
import { authManager } from './auth-manager';
import { getFirebaseDb } from './firebase-instance';
import { Subject } from 'rxjs';
import { ref, onValue, off, get } from 'firebase/database';

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
    off: jest.fn(),
    get: jest.fn(),
    child: jest.fn()
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

        // Mock get (initial sync)
        (get as jest.Mock).mockResolvedValue({ val: () => [] });

        jest.spyOn(isSyncingFromRemote, 'next');
    });

    it('should perform initial sync on startup', async () => {
        const mockBookmarks = [{ title: 'Initial' }];
        (get as jest.Mock).mockResolvedValue({ val: () => mockBookmarks });

        await initializeDownstreamSync();

        expect(get).toHaveBeenCalled(); // Initial sync
        expect(bookmarkUtils.createBookmarksFromTree).toHaveBeenCalledWith(mockBookmarks);

        // Should subscribe to realtime updates after
        expect(onValue).toHaveBeenCalled();
    });

    it('should apply realtime updates after initial sync', async () => {
        jest.useFakeTimers();
        await initializeDownstreamSync();

        // Simulate Firebase realtime change
        const mockBookmarks = [{ title: 'Realtime' }];
        const snapshot = { val: () => mockBookmarks };

        mockOnValueCallback(snapshot);

        expect(isSyncingFromRemote.next).toHaveBeenCalledWith(true);

        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();

        expect(bookmarkUtils.clearAllBookmarks).toHaveBeenCalled();
        expect(bookmarkUtils.createBookmarksFromTree).toHaveBeenCalledWith(mockBookmarks);

        jest.advanceTimersByTime(500);
        expect(isSyncingFromRemote.next).toHaveBeenCalledWith(false);
        jest.useRealTimers();
    });
});
