import { localBookmarksChanged$, isSyncingFromRemote } from './bookmark-streams';
import { chrome } from 'jest-chrome';

describe('Bookmark Streams', () => {
    beforeEach(() => {
        isSyncingFromRemote.next(false); // Reset flag before each test
    });

    it('should emit when a bookmark is created', (done) => {
        const subscription = localBookmarksChanged$.subscribe((event) => {
            expect(event).toBeDefined();
            subscription.unsubscribe();
            done();
        });

        // Trigger the mock event
        chrome.bookmarks.onCreated.callListeners('id', {} as any);
    });

    it('should emit when a bookmark is removed', (done) => {
        const subscription = localBookmarksChanged$.subscribe((event) => {
            expect(event).toBeDefined();
            subscription.unsubscribe();
            done();
        });

        chrome.bookmarks.onRemoved.callListeners('id', {} as any);
    });

    it('should emit when a bookmark is changed', (done) => {
        const subscription = localBookmarksChanged$.subscribe((event) => {
            expect(event).toBeDefined();
            subscription.unsubscribe();
            done();
        });

        chrome.bookmarks.onChanged.callListeners('id', {} as any);
    });

    it('should emit when a bookmark is moved', (done) => {
        const subscription = localBookmarksChanged$.subscribe((event) => {
            expect(event).toBeDefined();
            subscription.unsubscribe();
            done();
        });

        chrome.bookmarks.onMoved.callListeners('id', {} as any);
    });

    it('should NOT emit when syncing from remote', (done) => {
        isSyncingFromRemote.next(true);
        let emitted = false;

        const subscription = localBookmarksChanged$.subscribe(() => {
            emitted = true;
        });

        chrome.bookmarks.onCreated.callListeners('id', {} as any);

        setTimeout(() => {
            expect(emitted).toBe(false);
            subscription.unsubscribe();
            done();
        }, 100);
    });
});
