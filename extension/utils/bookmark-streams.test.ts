import { localBookmarksChanged$ } from './bookmark-streams';
import { chrome } from 'jest-chrome';

describe('Bookmark Streams', () => {
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
});
