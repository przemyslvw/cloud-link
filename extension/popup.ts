// popup.ts
console.log('Popup script loaded');

const loginView = document.getElementById('login-view')!;
const loggedInView = document.getElementById('logged-in-view')!;
const resetView = document.getElementById('reset-view')!;
const loadingView = document.getElementById('loading-view')!;
const conflictView = document.getElementById('conflict-view')!; // New View
const statusBadge = document.getElementById('status-badge')!; // New Badge

const loginForm = document.getElementById('login-form') as HTMLFormElement;
const emailInput = document.getElementById('email') as HTMLInputElement;
const passwordInput = document.getElementById('password') as HTMLInputElement;
const errorMessage = document.getElementById('error-message')!;
const userEmailSpan = document.getElementById('user-email')!;
const logoutBtn = document.getElementById('logout-btn')!;
const syncBtn = document.getElementById('sync-btn') as HTMLButtonElement;
const syncStatus = document.getElementById('sync-status')!;

const forgotPasswordLink = document.getElementById('forgot-password-link')!;
const backToLoginLink = document.getElementById('back-to-login-link')!;
const resetForm = document.getElementById('reset-form') as HTMLFormElement;
const resetEmailInput = document.getElementById('reset-email') as HTMLInputElement;
const resetMessage = document.getElementById('reset-message')!;

// Conflict Elements
const remoteCountSpan = document.getElementById('remote-count')!;
const localCountSpan = document.getElementById('local-count')!;
const btnMerge = document.getElementById('btn-merge')!;
const btnKeepLocal = document.getElementById('btn-keep-local')!;
const btnKeepRemote = document.getElementById('btn-keep-remote')!;
const btnClearAll = document.getElementById('btn-clear-all')!;

// Check auth state on load
chrome.runtime.sendMessage({ action: 'getUser' }, (response) => {
    loadingView.style.display = 'none';
    if (response.user) {
        showLoggedInView(response.user.email);
        startStatusPolling();
    } else {
        showLoginView();
    }
});

function showLoginView() {
    loginView.style.display = 'block';
    loggedInView.style.display = 'none';
    resetView.style.display = 'none';
    conflictView.style.display = 'none';
}

function showResetView() {
    loginView.style.display = 'none';
    loggedInView.style.display = 'none';
    resetView.style.display = 'block';
    conflictView.style.display = 'none';
    resetMessage.textContent = '';
}

function showLoggedInView(email: string) {
    loginView.style.display = 'none';
    loggedInView.style.display = 'block';
    resetView.style.display = 'none';
    conflictView.style.display = 'none';
    userEmailSpan.textContent = email;
}

function showConflictView(localCount: number, remoteCount: number) {
    loginView.style.display = 'none';
    loggedInView.style.display = 'none'; // Hide main view to focus on conflict
    resetView.style.display = 'none';
    conflictView.style.display = 'block';

    localCountSpan.textContent = localCount.toString();
    remoteCountSpan.textContent = remoteCount.toString();
}

function updateStatusBadge(status: any) {
    statusBadge.style.display = 'block';
    if (status.state === 'SYNCING') {
        statusBadge.style.backgroundColor = '#e3f2fd';
        statusBadge.style.color = '#0d47a1';
        statusBadge.textContent = '🔄 Syncing...';
    } else if (status.state === 'CONFLICT') {
        statusBadge.style.backgroundColor = '#ffebee';
        statusBadge.style.color = '#c62828';
        statusBadge.textContent = '⚠️ Conflict Detected';
    } else if (status.state === 'ERROR') {
        statusBadge.style.backgroundColor = '#ffebee';
        statusBadge.style.color = '#c62828';
        statusBadge.textContent = '❌ Error: ' + status.error;
    } else {
        statusBadge.style.display = 'none';
    }
}

function startStatusPolling() {
    setInterval(() => {
        chrome.runtime.sendMessage({ action: 'getSyncStatus' }, (status) => {
            if (status) {
                updateStatusBadge(status);
                if (status.state === 'CONFLICT') {
                    showConflictView(status.itemsLocal || 0, status.itemsRemote || 0);
                } else if (conflictView.style.display === 'block') {
                    // If we were in conflict check but state changed (e.g. resolved), go back
                    chrome.runtime.sendMessage({ action: 'getUser' }, (res) => {
                        if (res.user) showLoggedInView(res.user.email);
                    });
                }
            }
        });
    }, 1000);
}

// Conflict Handlers
function resolve(strategy: string) {
    chrome.runtime.sendMessage({ action: 'resolveConflict', strategy }, (response) => {
        if (response.success) {
            // UI will update via poll
            console.log('Resolution sent');
        } else {
            alert('Resolution failed: ' + response.error);
        }
    });
}

btnMerge.addEventListener('click', () => resolve('merge'));
btnKeepLocal.addEventListener('click', () => resolve('local'));
btnKeepRemote.addEventListener('click', () => resolve('remote'));
btnClearAll.addEventListener('click', () => {
    if (confirm('Are you sure you want to delete ALL bookmarks from both the browser and the cloud? This cannot be undone.')) {
        resolve('clear');
    }
});

// Login form handler
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMessage.textContent = '';

    const email = emailInput.value;
    const password = passwordInput.value;

    chrome.runtime.sendMessage(
        { action: 'login', email, password },
        (response) => {
            if (response.success) {
                showLoggedInView(response.user.email);
                startStatusPolling();
            } else {
                errorMessage.textContent = response.error || 'Login failed';
            }
        }
    );
});

// View switching handlers
forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    showResetView();
});

backToLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    showLoginView();
});

// Reset password handler
resetForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = resetEmailInput.value;
    resetMessage.textContent = 'Sending...';
    resetMessage.className = 'message';

    chrome.runtime.sendMessage({ action: 'resetPassword', email }, (response) => {
        if (response.success) {
            resetMessage.textContent = 'Reset link sent! Check your email.';
            resetMessage.className = 'message success';
            setTimeout(() => {
                showLoginView();
            }, 3000);
        } else {
            resetMessage.textContent = response.error || 'Failed to send reset link.';
            resetMessage.className = 'message error';
        }
    });
});

// Logout handler
logoutBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'logout' }, (response) => {
        if (response.success) {
            showLoginView();
            emailInput.value = '';
            passwordInput.value = '';
        }
    });
});

// Sync button handler
syncBtn.addEventListener('click', () => {
    syncStatus.textContent = 'Syncing...';
    syncBtn.disabled = true;

    chrome.runtime.sendMessage({ action: 'syncNow' }, (response) => {
        syncBtn.disabled = false;

        // Response success is generic now, status handled by poller
        if (!response.success) {
            syncStatus.textContent = 'Start failed: ' + response.error;
        } else {
            syncStatus.textContent = 'Sync started...';
        }

        setTimeout(() => {
            syncStatus.textContent = '';
        }, 5000);
    });
});
