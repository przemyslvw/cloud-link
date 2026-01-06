import { Injectable, inject } from '@angular/core';
import { Database, objectVal, ref, set } from '@angular/fire/database';
import { Observable, of, firstValueFrom, from } from 'rxjs';
import { map, take, switchMap } from 'rxjs/operators';
import { BookmarkTreeNode, SyncVersion } from '../models/bookmark.model';

@Injectable({
    providedIn: 'root'
})
export class BookmarkService {
    private db = inject(Database);

    getBookmarkTree(uid: string): Observable<BookmarkTreeNode[]> {
        if (!uid) return of([]);
        const treeRef = ref(this.db, `bookmarks/${uid}/tree`);
        return objectVal<any>(treeRef).pipe(
            map(data => {
                if (!data) return [];
                if (Array.isArray(data)) return data;
                return Object.values(data);
            })
        );
    }

    // TODO: Implement tree manipulation methods (add/move/delete) if needed for the web app
    // For now, the web app is primarily a viewer or needs a major refactor to support tree editing

    deleteBookmark(uid: string, nodeId: string): Observable<void> {
        const treeRef = ref(this.db, `bookmarks/${uid}/tree`);

        return this.getBookmarkTree(uid).pipe(
            take(1),
            switchMap(currentTree => {
                if (!currentTree || currentTree.length === 0) return of(undefined);

                const updatedTree = this.removeNodeFromTree(currentTree, nodeId);

                // Update tree
                const updateTreePromise = set(treeRef, updatedTree);

                // Update metadata
                const metadataRef = ref(this.db, `bookmarks/${uid}/metadata`);
                const updateMetadataPromise = firstValueFrom(objectVal<SyncVersion>(metadataRef).pipe(take(1))).then(currentMetadata => {
                    const newVersion = (currentMetadata?.version || 0) + 1;
                    const metadata: SyncVersion = {
                        version: newVersion,
                        timestamp: Date.now(),
                        source: 'web'
                    };
                    return set(metadataRef, metadata);
                });

                return from(Promise.all([updateTreePromise, updateMetadataPromise])).pipe(
                    map(() => undefined)
                );
            })
        );
    }

    private removeNodeFromTree(nodes: BookmarkTreeNode[], nodeId: string): BookmarkTreeNode[] {
        return nodes.filter(node => {
            if (node.id === nodeId) {
                return false;
            }
            if (node.children) {
                node.children = this.removeNodeFromTree(node.children, nodeId);
            }
            return true;
        });
    }

    async addBookmark(uid: string, bookmark: any): Promise<void> {
        console.warn('addBookmark not implemented for tree structure yet');
        return Promise.resolve();
    }

    async addFolder(uid: string, folder: any): Promise<void> {
        console.warn('addFolder not implemented for tree structure yet');
        return Promise.resolve();
    }
}
