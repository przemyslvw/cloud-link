import { Injectable, inject } from '@angular/core';
import { Database, objectVal, ref, set } from '@angular/fire/database';
import { Observable, of, firstValueFrom } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { BookmarkTreeNode } from '../models/bookmark.model';

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

    async deleteBookmark(uid: string, nodeId: string): Promise<void> {
        const treeRef = ref(this.db, `bookmarks/${uid}/tree`);
        const currentTree = await firstValueFrom(this.getBookmarkTree(uid).pipe(take(1)));

        if (!currentTree || currentTree.length === 0) return;

        const updatedTree = this.removeNodeFromTree(currentTree, nodeId);
        await set(treeRef, updatedTree);
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
