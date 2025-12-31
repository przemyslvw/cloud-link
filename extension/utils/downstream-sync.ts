import { Observable, fromEventPattern } from 'rxjs';
import { getFirebaseDb } from './firebase-instance';
import { ref, onValue, off, get, child } from 'firebase/database';
import { authManager } from './auth-manager';
import { isSyncingFromRemote } from './bookmark-streams';
import { clearAllBookmarks, createBookmarksFromTree, CleanBookmarkNode } from './bookmark-utils';

function createFirebaseStream(uid: string): Observable<CleanBookmarkNode[]> {
    const db = getFirebaseDb();
    const bookmarksRef = ref(db, `bookmarks/${uid}/tree`);

    return fromEventPattern(
        (handler) => onValue(bookmarksRef, (snapshot) => {
            const val = snapshot.val();
            handler(val || []);
        }),
        (handler) => off(bookmarksRef)
    );
}

async function applyRemoteChanges(remoteBookmarks: CleanBookmarkNode[]) {
    console.log('Applying remote changes from Firebase', remoteBookmarks);

    // 1. Set lock
    isSyncingFromRemote.next(true);

    try {
        // 2. Clear local bookmarks
        await clearAllBookmarks();

        // 3. Create new bookmarks
        await createBookmarksFromTree(remoteBookmarks);

        console.log('Successfully applied remote changes');
    } catch (err) {
        console.error('Error applying remote changes', err);
    } finally {
        // 4. Release lock
        setTimeout(() => {
            isSyncingFromRemote.next(false);
        }, 500);
    }
}

export async function initializeDownstreamSync() {
    const user = await authManager.getCurrentUser();
    if (!user) {
        console.log('User not logged in, skipping downstream sync init');
        return;
    }

    // Realtime Sync
    createFirebaseStream(user.uid).subscribe({
        next: (remoteBookmarks) => applyRemoteChanges(remoteBookmarks),
        error: (err) => console.error('Error in downstream sync stream', err)
    });
}
