// Background Service Worker
import { authManager } from './utils/auth-manager';
import { bookmarkDetector } from './utils/bookmark-detector';
import { syncEngine } from './utils/sync-engine';

console.log('Background service worker started');

chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');

    // Start listening for bookmark changes
    bookmarkDetector.startListening((type, data) => {
        console.log('Bookmark event:', type, data);
        // Trigger sync when bookmarks change
        handleBookmarkChange();
    });
});

// Handle bookmark changes with debouncing
let syncTimeout: number | null = null;
async function handleBookmarkChange() {
    // Debounce sync - wait 2 seconds after last change
    if (syncTimeout) {
        clearTimeout(syncTimeout);
    }

    syncTimeout = setTimeout(async () => {
        const user = await authManager.getCurrentUser();
        if (user) {
            console.log('Auto-syncing due to bookmark change...');
            await syncEngine.startSync(user.uid);
        }
    }, 2000);
}

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
                // Start bookmark detection after login
                bookmarkDetector.startListening((type, data) => {
                    console.log('Bookmark event:', type, data);
                    handleBookmarkChange();
                });
                // Start real-time listeners
                syncEngine.startListening(user.uid);
            })
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }

    if (request.action === 'logout') {
        authManager.logout()
            .then(() => {
                sendResponse({ success: true });
                bookmarkDetector.stopListening();
                syncEngine.stopSync();
                syncEngine.stopListening();
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
        bookmarkDetector.getAllBookmarks()
            .then(bookmarks => sendResponse({ success: true, bookmarks }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }

    if (request.action === 'syncNow') {
        authManager.getCurrentUser()
            .then(async user => {
                if (user) {
                    const result = await syncEngine.startSync(user.uid);
                    sendResponse({ success: result.success, result });
                } else {
                    sendResponse({ success: false, error: 'Not logged in' });
                }
            })
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
});
