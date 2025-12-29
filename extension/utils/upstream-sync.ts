import { localBookmarksChanged$ } from './bookmark-streams';
import { debounceTime, switchMap, map } from 'rxjs/operators';
import { from } from 'rxjs';
import { getBookmarkTree, sanitizeNode } from './bookmark-utils';
import { authManager } from './auth-manager';
import { getFirebaseDb } from './firebase-instance';
import { ref, set } from 'firebase/database';

export function initializeUpstreamSync() {
    localBookmarksChanged$.pipe(
        debounceTime(1000), // Wait for 1 second of silence
        switchMap(() => from(getBookmarkTree())), // Get latest tree
        map(tree => tree.map(sanitizeNode)), // Sanitize
        switchMap(async (cleanTree) => {
            const user = await authManager.getCurrentUser();
            if (!user) {
                console.log('User not logged in, skipping sync');
                return;
            }

            const db = getFirebaseDb();
            const bookmarksRef = ref(db, `users/${user.uid}`);
            await set(bookmarksRef, {
                bookmarks: cleanTree,
                lastUpdated: Date.now()
            });
            console.log('Synced bookmarks and timestamp to Firebase');
        })
    ).subscribe({
        error: (err) => console.error('Error in upstream sync:', err)
    });
}
