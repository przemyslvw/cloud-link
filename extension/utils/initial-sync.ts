import { getFirebaseDb } from './firebase-instance';
import { ref, get, set, update } from 'firebase/database';
import { from, of, iif, defer, throwError } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { authManager } from './auth-manager';
import { cleanBookmarksForExport, overwriteLocalBookmarks, getBookmarkTree } from './bookmark-utils';

export const initializeSync$ = defer(() => from(authManager.getCurrentUser())).pipe(
    switchMap(user => {
        if (!user) {
            return throwError(() => new Error("User not authenticated for sync initialization"));
        }

        const db = getFirebaseDb();
        const bookmarksRef = ref(db, `bookmarks/${user.uid}/tree`);
        const metadataRef = ref(db, `bookmarks/${user.uid}/metadata`);

        return from(get(bookmarksRef)).pipe(
            switchMap(snapshot => {
                const remoteData = snapshot.val();
                const dbIsEmpty = !snapshot.exists() || remoteData === null;

                return iif(
                    () => dbIsEmpty,
                    // Path A: Empty DB -> Send local to cloud
                    from(getBookmarkTree()).pipe(
                        switchMap(tree => {
                            // tree[0] is the root node. We want to sync its children (Bookmarks Bar, Other Bookmarks, etc.)
                            const rootChildren = tree[0]?.children || [];
                            return of(cleanBookmarksForExport(rootChildren));
                        }),
                        tap(() => console.log("Database empty. Initializing with local bookmarks...")),
                        switchMap(localData => {
                            const updates: any = {};
                            updates[`bookmarks/${user.uid}/tree`] = localData;
                            updates[`bookmarks/${user.uid}/metadata`] = {
                                version: 1,
                                timestamp: Date.now(),
                                source: 'extension_init'
                            };
                            return from(update(ref(db), updates));
                        }),
                        tap(() => console.log("Database initialized with local bookmarks."))
                    ),
                    // Path B: Existing DB -> Overwrite local
                    of(remoteData).pipe(
                        tap(() => console.log("Database has data. Overwriting local bookmarks...")),
                        switchMap(data => from(overwriteLocalBookmarks(data))),
                        tap(() => console.log("Local bookmarks overwritten from cloud."))
                    )
                );
            })
        );
    })
);
