import { fromEventPattern, merge, Observable } from 'rxjs';

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

// Main stream of local changes
export const localBookmarksChanged$ = merge(created$, removed$, changed$, moved$);
