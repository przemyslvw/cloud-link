interface VersionMetadata {
    version: number;
    timestamp: number;
    source: 'web' | 'browser' | 'import';
    itemCount?: {
        folders: number;
        links: number;
    };
}

export class VersionManager {
    constructor() {
        console.log('VersionManager initialized');
    }

    public async getLocalVersion(): Promise<VersionMetadata> {
        const data = await chrome.storage.local.get(['syncVersion']);
        return (data.syncVersion as VersionMetadata) || {
            version: 0,
            timestamp: 0,
            source: 'browser'
        };
    }

    public async updateLocalVersion(metadata: VersionMetadata): Promise<void> {
        await chrome.storage.local.set({ syncVersion: metadata });
        console.log('Updated local version:', metadata);
    }

    public async getLastSyncTime(): Promise<number> {
        const version = await this.getLocalVersion();
        return version.timestamp;
    }

    public async shouldSync(remoteVersion: VersionMetadata): Promise<boolean> {
        const localVersion = await this.getLocalVersion();

        // Always sync if versions differ
        if (localVersion.version !== remoteVersion.version) {
            return true;
        }

        // Skip if timestamps match (exact same sync)
        if (localVersion.timestamp === remoteVersion.timestamp) {
            return false;
        }

        return true;
    }

    public createVersionMetadata(version: number, source: 'web' | 'browser' | 'import', itemCount?: { folders: number; links: number }): VersionMetadata {
        return {
            version,
            timestamp: Date.now(),
            source,
            itemCount
        };
    }
}

export const versionManager = new VersionManager();

