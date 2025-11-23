export interface SyncVersion {
    version: number;
    timestamp: number;
    source: 'web' | 'browser' | 'import';
}

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
