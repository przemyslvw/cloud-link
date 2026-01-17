export enum SyncState {
    IDLE = 'IDLE',
    SYNCING = 'SYNCING',
    CONFLICT = 'CONFLICT',
    ERROR = 'ERROR'
}

export type ResolutionStrategy = 'merge' | 'local' | 'remote' | 'clear';

export interface SyncStatus {
    state: SyncState;
    lastSynced?: number;
    error?: string;
    itemsLocal?: number;
    itemsRemote?: number;
}
