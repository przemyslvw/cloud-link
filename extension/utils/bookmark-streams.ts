import { fromEventPattern, merge, Observable, BehaviorSubject } from 'rxjs';
import { filter, tap } from 'rxjs/operators';

// Flag to prevent loop (local changes triggered by remote sync)
export const isSyncingFromRemote = new BehaviorSubject<boolean>(false);

// Helper to create a stream from a Chrome event
const createStream = (eventSource: chrome.events.Event<any>): Observable<any> =>
    fromEventPattern(
        (handler) => eventSource.addListener(handler),
        (handler) => eventSource.removeListener(handler)
    );

const created$ = createStream(chrome.bookmarks.onCreated);
const removed$ = createStream(chrome.bookmarks.onRemoved);
const changed$ = createStream(chrome.bookmarks.onChanged);
const moved$ = createStream(chrome.bookmarks.onMoved);

// Main stream of local changes, ignored if we are syncing from remote
export const localBookmarksChanged$ = merge(created$, removed$, changed$, moved$).pipe(
    tap(event => console.log('Bookmark event detected:', event)),
    filter(() => {
        const isSyncing = isSyncingFromRemote.getValue();
        if (isSyncing) {
            console.log('Ignoring local change because downstream sync is active');
        }
        return !isSyncing;
    }),
    tap(() => console.log('Bookmark event passed filter'))
);
