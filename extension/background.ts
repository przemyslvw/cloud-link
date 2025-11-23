// Background Service Worker
import { authManager } from './utils/auth-manager';
import { bookmarkDetector } from './utils/bookmark-detector';

console.log('Background service worker started');

chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');

    // Start listening for bookmark changes
    bookmarkDetector.startListening((type, data) => {
        console.log('Bookmark event:', type, data);
        // TODO: Send to sync engine
    });
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
                // Start bookmark detection after login
                bookmarkDetector.startListening((type, data) => {
                    console.log('Bookmark event:', type, data);
                });
            })
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }

    if (request.action === 'logout') {
        authManager.logout()
            .then(() => {
                sendResponse({ success: true });
                bookmarkDetector.stopListening();
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
        // TODO: Trigger manual sync
        sendResponse({ success: true, message: 'Sync triggered' });
        return true;
    }
});
