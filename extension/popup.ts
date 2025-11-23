// popup.ts
console.log('Popup script loaded');

const loginView = document.getElementById('login-view')!;
const loggedInView = document.getElementById('logged-in-view')!;
const loadingView = document.getElementById('loading-view')!;
const loginForm = document.getElementById('login-form') as HTMLFormElement;
const emailInput = document.getElementById('email') as HTMLInputElement;
const passwordInput = document.getElementById('password') as HTMLInputElement;
const errorMessage = document.getElementById('error-message')!;
const userEmailSpan = document.getElementById('user-email')!;
const logoutBtn = document.getElementById('logout-btn')!;
const syncBtn = document.getElementById('sync-btn')!;
const syncStatus = document.getElementById('sync-status')!;

// Check auth state on load
chrome.runtime.sendMessage({ action: 'getUser' }, (response) => {
    loadingView.style.display = 'none';
    if (response.user) {
        showLoggedInView(response.user.email);
    } else {
        showLoginView();
    }
});

function showLoginView() {
    loginView.style.display = 'block';
    loggedInView.style.display = 'none';
}

function showLoggedInView(email: string) {
    loginView.style.display = 'none';
    loggedInView.style.display = 'block';
    userEmailSpan.textContent = email;
}

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
            } else {
                errorMessage.textContent = response.error || 'Login failed';
            }
        }
    );
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

// Sync button handler (placeholder for now)
syncBtn.addEventListener('click', () => {
    syncStatus.textContent = 'Sync functionality coming soon...';
    setTimeout(() => {
        syncStatus.textContent = '';
    }, 3000);
});
