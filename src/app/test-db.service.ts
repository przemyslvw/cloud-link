import { Injectable, inject } from '@angular/core';
import { Database, ref, set, onValue } from '@angular/fire/database';

@Injectable({
    providedIn: 'root'
})
export class TestDbService {
    private db = inject(Database);

    testConnection() {
        const testRef = ref(this.db, 'test-connection');
        set(testRef, {
            timestamp: Date.now(),
            message: 'Hello from Angular!'
        }).then(() => {
            console.log('Database write successful!');
        }).catch((error) => {
            console.error('Database write failed:', error);
        });

        onValue(testRef, (snapshot) => {
            const data = snapshot.val();
            console.log('Database read successful:', data);
        });
    }
}
