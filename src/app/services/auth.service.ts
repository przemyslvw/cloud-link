import { Injectable, inject } from '@angular/core';
import { Auth, authState, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, User, UserCredential } from '@angular/fire/auth';
import { Database, ref, update } from '@angular/fire/database';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private auth: Auth = inject(Auth);
    private db: Database = inject(Database);
    user$: Observable<User | null> = authState(this.auth);

    constructor() { }

    login(email: string, password: string): Promise<UserCredential> {
        return signInWithEmailAndPassword(this.auth, email, password);
    }

    register(email: string, password: string): Promise<UserCredential> {
        return createUserWithEmailAndPassword(this.auth, email, password)
            .then(async (credential) => {
                const uid = credential.user.uid;
                const timestamp = Date.now();

                // Bootstrap user data
                const updates: any = {};
                updates[`users/${uid}`] = {
                    email: email,
                    createdAt: timestamp,
                    lastSync: 0
                };
                updates[`bookmarks/${uid}/syncVersion`] = {
                    version: 0,
                    timestamp: timestamp,
                    source: 'web'
                };

                // Use update() on the root reference to perform atomic multi-path updates
                await update(ref(this.db), updates);

                return credential;
            });
    }

    logout(): Promise<void> {
        return signOut(this.auth);
    }
}
