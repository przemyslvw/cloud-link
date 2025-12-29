// Background Service Worker
import { authManager } from './utils/auth-manager';
import { bookmarkDetector } from './utils/bookmark-detector';
import { initializeUpstreamSync } from './utils/upstream-sync';

console.log('Background service worker started');

initializeUpstreamSync();

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
            })
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

    if (request.action === 'syncNow') {
        sendResponse({ success: false, error: 'Sync is currently disabled pending new implementation.' });
        return true;
    }
});
