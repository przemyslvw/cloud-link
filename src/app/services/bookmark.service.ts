import { Injectable, inject } from '@angular/core';
import { Database, listVal, ref } from '@angular/fire/database';
import { Observable, of } from 'rxjs';
import { Bookmark, Folder } from '../models/bookmark.model';

@Injectable({
    providedIn: 'root'
})
export class BookmarkService {
    private db = inject(Database);

    getFolders(uid: string): Observable<Folder[]> {
        if (!uid) return of([]);
        const foldersRef = ref(this.db, `bookmarks/${uid}/folders`);
        return listVal<Folder>(foldersRef);
    }

    getBookmarks(uid: string): Observable<Bookmark[]> {
        if (!uid) return of([]);
        const bookmarksRef = ref(this.db, `bookmarks/${uid}/links`);
        return listVal<Bookmark>(bookmarksRef);
    }
}
