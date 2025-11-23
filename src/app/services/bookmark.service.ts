import { Injectable, inject } from '@angular/core';
import { Database, listVal, ref, push, set, runTransaction } from '@angular/fire/database';
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

    addBookmark(uid: string, bookmark: Partial<Bookmark>): Promise<void> {
        const bookmarksRef = ref(this.db, `bookmarks/${uid}/links`);
        const newBookmarkRef = push(bookmarksRef);
        return set(newBookmarkRef, {
            ...bookmark,
            id: newBookmarkRef.key,
            createdAt: Date.now(),
            updatedAt: Date.now()
        });
    }

    async addFolder(uid: string, folder: Partial<Folder>): Promise<void> {
        const foldersRef = ref(this.db, `bookmarks/${uid}/folders`);
        const newFolderRef = push(foldersRef);
        const folderId = newFolderRef.key;

        const folderData = {
            ...folder,
            id: folderId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            children: []
        };

        await set(newFolderRef, folderData);

        if (folder.parentId) {
            // Update parent's children array
            // We need to fetch the parent first to get existing children or just push to a children node if structure allows.
            // Based on the interface 'children: string[]', it's an array.
            // In Firebase Realtime DB, arrays can be tricky. It's often better to use a map for children, but let's stick to the model for now.
            // Actually, to be safe with concurrent updates, we should use a transaction or just append to a list if we change structure.
            // But for now, let's just read and update.

            // A better approach for Realtime DB is storing children as keys: children: { [childId]: true }
            // But the model says string[]. Let's assume we read it, modify it, and write it back.
            // OR, we can just use a transaction on the parent node.

            const parentRef = ref(this.db, `bookmarks/${uid}/folders/${folder.parentId}`);
            // For simplicity in this phase, let's just update.
            // Ideally we would change the model to use a map for children.

            // Let's try to use a transaction to append the child ID.
            // However, 'runTransaction' needs to be imported.
            // Let's stick to a simpler read-modify-write for this MVP or just assume we can update it.

            // Let's import get and update.
            // Actually, let's just use 'update' to add it to a 'children' object if we can change the model?
            // User specified 'children?: string[]'.

            // Let's do a transaction.
            await runTransaction(parentRef, (currentData) => {
                if (currentData) {
                    if (!currentData.children) {
                        currentData.children = [];
                    }
                    currentData.children.push(folderId);
                }
                return currentData;
            });
        }
    }
}
