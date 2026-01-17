import { authManager } from './utils/auth-manager';
import { bookmarkDetector } from './utils/bookmark-detector';
// import { initializeUpstreamSync } from './utils/upstream-sync'; // Managed by SyncManager now
// import { initializeDownstreamSync } from './utils/downstream-sync'; // Managed by SyncManager now
// import { initializeSync$ } from './utils/initial-sync'; // Deprecated
import { syncManager } from './utils/sync-manager';

console.log('Background service worker started');

// Initialize Sync Manager when auth state is ready (or just let it handle its own checks)
authManager.getCurrentUser().then(user => {
    if (user) {
        syncManager.start();
    }
});


chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
});

// Auto-refresh token every 30 minutes
setInterval(async () => {
    await authManager.checkAndRefreshToken();
}, 30 * 60 * 1000);

// Listen for messages from popup/content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'login') {
        authManager.login(request.email, request.password)
            .then(user => {
                sendResponse({ success: true, user: { uid: user.uid, email: user.email } });
                syncManager.start(); // Start sync on login
            })
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }

    if (request.action === 'resetPassword') {
        authManager.resetPassword(request.email)
            .then(() => sendResponse({ success: true }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }

    if (request.action === 'logout') {
        authManager.logout()
            .then(() => {
                sendResponse({ success: true });
            })
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }

    if (request.action === 'getUser') {
        authManager.getCurrentUser()
            .then(user => sendResponse({ user: user ? { uid: user.uid, email: user.email } : null }))
            .catch(error => sendResponse({ error: error.message }));
        return true;
    }

    if (request.action === 'getAllBookmarks') {
        bookmarkDetector.getBookmarkTree()
            .then(bookmarks => sendResponse({ success: true, bookmarks }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }

    // --- Sync Manager Interaction ---

    if (request.action === 'getSyncStatus') {
        sendResponse(syncManager.currentStatus);
        return true;
    }

    if (request.action === 'resolveConflict') {
        syncManager.resolveConflict(request.strategy)
            .then(() => sendResponse({ success: true }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }

    if (request.action === 'syncNow') {
        // Re-trigger start logic or just manual sync
        syncManager.start()
            .then(() => sendResponse({ success: true }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }
});
