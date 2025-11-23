import { initializeApp, FirebaseApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';
import { getAuth, Auth } from 'firebase/auth';

// Import config from gitignored file
import { firebaseConfig } from './firebase-config';

// Singleton Firebase instances
let app: FirebaseApp | null = null;
let db: Database | null = null;
let auth: Auth | null = null;

export function getFirebaseApp(): FirebaseApp {
    if (!app) {
        app = initializeApp(firebaseConfig);
    }
    return app;
}

export function getFirebaseDb(): Database {
    if (!db) {
        db = getDatabase(getFirebaseApp());
    }
    return db;
}

export function getFirebaseAuth(): Auth {
    if (!auth) {
        auth = getAuth(getFirebaseApp());
    }
    return auth;
}
