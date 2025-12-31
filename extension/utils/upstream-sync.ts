import { localBookmarksChanged$ } from './bookmark-streams';
import { debounceTime, switchMap, map, tap } from 'rxjs/operators';
import { from } from 'rxjs';
import { getBookmarkTree, cleanBookmarksForExport } from './bookmark-utils';
import { authManager } from './auth-manager';
import { getFirebaseDb } from './firebase-instance';
import { ref, update } from 'firebase/database';

export function initializeUpstreamSync() {
    localBookmarksChanged$.pipe(
        debounceTime(1000), // Wait for 1 second of silence
        tap(() => console.log('Upstream sync triggered (debounce complete)')),
        switchMap(() => from(getBookmarkTree())), // Get latest tree
        map(tree => {
            console.log('Tree fetched for upstream sync');
            const rootChildren = tree[0]?.children || [];
            return cleanBookmarksForExport(rootChildren);
        }),
        switchMap(async (cleanTree) => {
            console.log('Sanitized tree ready for upload:', cleanTree);
            const user = await authManager.getCurrentUser();
            if (!user) {
                console.log('User not logged in, skipping sync');
                return;
            }

            const db = getFirebaseDb();

            const updates: any = {};
            updates[`bookmarks/${user.uid}/tree`] = cleanTree;
            updates[`bookmarks/${user.uid}/metadata`] = {
                version: Date.now(), // Simple versioning for now
                timestamp: Date.now(),
                source: 'extension_upstream'
            };

            console.log('Writing to Firebase...');
            await update(ref(db), updates);
            console.log('Synced bookmarks and timestamp to Firebase');
        })
    ).subscribe({
        error: (err) => console.error('Error in upstream sync:', err)
    });
}
