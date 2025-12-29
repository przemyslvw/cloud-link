import { Observable, fromEventPattern } from 'rxjs';
import { getFirebaseDb } from './firebase-instance';
import { ref, onValue, off, DatabaseReference } from 'firebase/database';
import { authManager } from './auth-manager';
import { isSyncingFromRemote } from './bookmark-streams';
import { clearAllBookmarks, createBookmarksFromTree, CleanBookmarkNode } from './bookmark-utils';

function createFirebaseStream(uid: string): Observable<CleanBookmarkNode[]> {
    const db = getFirebaseDb();
    const bookmarksRef = ref(db, `users/${uid}/bookmarks`);

    return fromEventPattern(
        (handler) => onValue(bookmarksRef, (snapshot) => {
            const val = snapshot.val();
            // If val is null (no bookmarks yet), return empty array
            handler(val || []);
        }),
        (handler) => off(bookmarksRef) // In real implementation we might need to handle off correctly if handler is wrapped
    );
}

export async function initializeDownstreamSync() {
    const user = await authManager.getCurrentUser();
    if (!user) {
        console.log('User not logged in, skipping downstream sync init');
        return;
    }

    createFirebaseStream(user.uid).subscribe({
        next: async (remoteBookmarks) => {
            console.log('Received bookmarks from Firebase', remoteBookmarks);

            // 1. Set lock
            isSyncingFromRemote.next(true);

            try {
                // 2. Clear local bookmarks
                await clearAllBookmarks();

                // 3. Create new bookmarks
                await createBookmarksFromTree(remoteBookmarks);

                console.log('Successfully synced from remote');
            } catch (err) {
                console.error('Error applying remote changes', err);
            } finally {
                // 4. Release lock
                // We add a small delay to ensure any lingering chrome events are processed/ignored
                setTimeout(() => {
                    isSyncingFromRemote.next(false);
                }, 500);
            }
        },
        error: (err) => console.error('Error in downstream sync stream', err)
    });
}
