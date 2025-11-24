import { signInWithEmailAndPassword, onAuthStateChanged, User } from 'firebase/auth';
import { getFirebaseAuth } from './firebase-instance';

class AuthManager {
    private auth;

    constructor() {
        this.auth = getFirebaseAuth();
        this.setupAuthListener();
    }

    private setupAuthListener() {
        onAuthStateChanged(this.auth, async (user) => {
            if (user) {
                // User is signed in
                const token = await user.getIdToken();
                await this.saveUserData(user, token);
                console.log('User authenticated:', user.email);
            } else {
                // User is signed out
                await this.clearUserData();
                console.log('User signed out');
            }
        });
    }

    async login(email: string, password: string): Promise<User> {
        const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
        return userCredential.user;
    }

    async logout(): Promise<void> {
        await this.auth.signOut();
    }

    async getCurrentUser(): Promise<User | null> {
        await this.auth.authStateReady();
        return this.auth.currentUser;
    }

    async getToken(): Promise<string | null> {
        const user = this.auth.currentUser;
        if (user) {
            return await user.getIdToken();
        }
        return null;
    }

    private async saveUserData(user: User, token: string): Promise<void> {
        await chrome.storage.sync.set({
            user: {
                uid: user.uid,
                email: user.email,
                token: token,
                tokenExpiry: Date.now() + 3600000 // 1 hour
            }
        });
    }

    private async clearUserData(): Promise<void> {
        await chrome.storage.sync.remove(['user']);
    }

    async refreshToken(): Promise<string | null> {
        const user = this.auth.currentUser;
        if (user) {
            const token = await user.getIdToken(true); // Force refresh
            await this.saveUserData(user, token);
            return token;
        }
        return null;
    }

    // Check if token needs refresh
    async checkAndRefreshToken(): Promise<void> {
        const data = await chrome.storage.sync.get(['user']);
        if (data.user && (data.user as any).tokenExpiry) {
            const timeUntilExpiry = (data.user as any).tokenExpiry - Date.now();
            // Refresh if less than 5 minutes remaining
            if (timeUntilExpiry < 300000) {
                await this.refreshToken();
            }
        }
    }
}

export const authManager = new AuthManager();
