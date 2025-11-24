export interface SyncVersion {
    version: number;
    timestamp: number;
    source: 'web' | 'browser' | 'import';
}

export interface BookmarkTreeNode {
    id: string;
    parentId?: string;
    index?: number;
    url?: string;
    title: string;
    dateAdded?: number;
    dateGroupModified?: number;
    children?: BookmarkTreeNode[];
}

// Keep legacy interfaces for now if needed, or remove if we are fully migrating
// For now, I'll comment them out to ensure we catch all usages
/*
export interface Folder {
    id: string;
    parentId: string | null;
    name: string;
    icon?: string;
    description?: string;
    tags?: string[];
    createdAt: number;
    updatedAt: number;
    children?: string[]; // IDs of child folders
}

export interface Bookmark {
    id: string;
    folderId: string;
    name: string;
    url: string;
    icon?: string;
    description?: string;
    tags?: string[];
    createdAt: number;
    updatedAt: number;
}
*/
