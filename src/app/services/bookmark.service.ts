import { Injectable, inject } from '@angular/core';
import { Database, objectVal, ref, set } from '@angular/fire/database';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
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

    async addBookmark(uid: string, bookmark: any): Promise<void> {
        console.warn('addBookmark not implemented for tree structure yet');
        return Promise.resolve();
    }

    async addFolder(uid: string, folder: any): Promise<void> {
        console.warn('addFolder not implemented for tree structure yet');
        return Promise.resolve();
    }
}
