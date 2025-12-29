import { Observable, fromEventPattern } from 'rxjs';
import { getFirebaseDb } from './firebase-instance';
import { ref, onValue, off, get, child } from 'firebase/database';
import { authManager } from './auth-manager';
import { isSyncingFromRemote } from './bookmark-streams';
import { clearAllBookmarks, createBookmarksFromTree, CleanBookmarkNode } from './bookmark-utils';

function createFirebaseStream(uid: string): Observable<CleanBookmarkNode[]> {
    const db = getFirebaseDb();
    const bookmarksRef = ref(db, `users/${uid}/bookmarks`);

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

async function performInitialSync(uid: string) {
    console.log('Performing initial sync...');
    const db = getFirebaseDb();
    const bookmarksRef = ref(db, `users/${uid}/bookmarks`);

    try {
        const snapshot = await get(bookmarksRef);
        const val = snapshot.val();
        await applyRemoteChanges(val || []);
        console.log('Initial sync complete');
    } catch (err) {
        console.error('Initial sync failed', err);
    }
}

export async function initializeDownstreamSync() {
    const user = await authManager.getCurrentUser();
    if (!user) {
        console.log('User not logged in, skipping downstream sync init');
        return;
    }

    // 1. Initial Sync (Startup)
    await performInitialSync(user.uid);

    // 2. Realtime Sync
    createFirebaseStream(user.uid).subscribe({
        next: (remoteBookmarks) => applyRemoteChanges(remoteBookmarks),
        error: (err) => console.error('Error in downstream sync stream', err)
    });
}
