# CloudLink
# 📋 Raindrop Clone - Spis Treści Wdrożenia

## **ARCHITEKTURA SYSTEMU**

```
┌─────────────────────────────────────────────────────────┐
│                    FIREBASE PROJECT                     │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────┐   │
│  │   Authentication (Firebase Auth + Custom Claims) │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │   Realtime Database (Sync bookmarks + metadata)  │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │   Firestore (Users collection - optional later)  │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
         ▲                              ▲
         │                              │
    ┌────┴────────────────┐      ┌──────┴─────────────┐
    │   Web Application   │      │ Chrome Extension  │
    │ (Angular + RxJS)    │      │ (Content Script)  │
    │ - Minimal for now   │      │ - Core sync logic │
    │ - Auth + View links │      │ - Bookmark detect │
    └────────────────────┘      │ - Versioning      │
                                │ - Real-time push  │
                                └──────────────────┘
```

---

## **STRUKTURA REALTIME DATABASE**

```json
{
  "users": {
    "userId_1": {
      "email": "user@example.com",
      "createdAt": 1700000000,
      "lastSync": 1700000000
    }
  },
  "bookmarks": {
    "userId_1": {
      "syncVersion": {
        "version": 1,
        "timestamp": 1700000000,
        "source": "browser|web|import"
      },
      "folders": {
        "folder_id_1": {
          "id": "folder_id_1",
          "parentId": null,
          "name": "Development",
          "icon": "🔧",
          "description": "Development tools and resources",
          "tags": ["dev", "tools"],
          "createdAt": 1700000000,
          "updatedAt": 1700000000,
          "children": ["folder_id_2", "folder_id_3"]
        },
        "folder_id_2": {
          "id": "folder_id_2",
          "parentId": "folder_id_1",
          "name": "Angular",
          "icon": "🅰️",
          "description": "Angular framework resources",
          "tags": ["angular", "framework"],
          "createdAt": 1700000000,
          "updatedAt": 1700000000,
          "children": []
        },
        "folder_id_3": {
          "id": "folder_id_3",
          "parentId": "folder_id_1",
          "name": "Firebase",
          "icon": "🔥",
          "description": "Firebase documentation",
          "tags": ["firebase", "backend"],
          "createdAt": 1700000000,
          "updatedAt": 1700000000,
          "children": []
        }
      },
      "links": {
        "link_id_1": {
          "id": "link_id_1",
          "folderId": "folder_id_2",
          "name": "Angular Documentation",
          "url": "https://angular.io",
          "icon": "data:image/png;base64,...",
          "description": "Official Angular docs",
          "tags": ["documentation", "angular"],
          "createdAt": 1700000000,
          "updatedAt": 1700000000
        }
      }
    }
  }
}
```

### **Wyjaśnienie Struktury:**
- **syncVersion** - Metadata do konflikt resolution (bi-directional sync)
- **folders** - Hierarchiczna struktura z parentId (unlimited nesting)
- **links** - Linki z referencją do folderId
- **children** - Array ID podfolderów (dla szybkiego nawigowania)
- Każdy link i folder w wielu katalogach → osobny record z różnym ID (duplikacja logiczna, nie danych)

---

## **SECURITY RULES (Firebase Realtime Database)**

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid",
        ".validate": "newData.hasChildren(['email', 'createdAt'])"
      }
    },
    "bookmarks": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid",
        "syncVersion": {
          ".validate": "newData.hasChildren(['version', 'timestamp', 'source'])"
        },
        "folders": {
          "$folderId": {
            ".validate": "newData.hasChildren(['id', 'name', 'parentId', 'children', 'createdAt'])"
          }
        },
        "links": {
          "$linkId": {
            ".validate": "newData.hasChildren(['id', 'folderId', 'name', 'url', 'createdAt'])"
          }
        }
      }
    }
  }
}
```

---

## **STACK TECHNOLOGICZNY - SZCZEGÓŁY**

| Layer | Technology | Wersja | Zastosowanie |
|-------|-----------|--------|--------------|
| **Frontend Web** | Angular 18+ | 18+ | SPA + RxJS observables |
| **State Mgmt** | RxJS + AngularFire | 7.6+ | Real-time sync z Firebase |
| **UI** | Angular Material | 17+ | Components + Dark Mode |
| **Styling** | SCSS/CSS Custom Props | - | Mobile-first + Dark Mode |
| **Auth** | Firebase Authentication | - | Email/password + Custom Claims |
| **Database** | Firebase Realtime DB | - | Real-time bi-directional sync |
| **Extension** | Vanilla JS + TypeScript | - | Manifest V3 (najnowszy) |
| **Sync Engine** | TypeScript classes | - | Conflict resolution logic |
| **Version Control** | Git | - | GitHub |
| **Build** | Angular CLI | - | Dev + Production builds |

---

## **ETAPY WDROŻENIA**

### **FAZA 0: SETUP INFRASTRUKTURY** ⚙️
1. ✅ Stworzenie Firebase Project
2. ✅ Konfiguracja Firebase Auth
3. ✅ Inicjalizacja Realtime Database
4. ✅ Napisanie Security Rules
5. ✅ Setup GitHub repository
6. ✅ Struktura folderów (web-app + extension)

---

### **FAZA 1: APLIKACJA WEBOWA (MINIMAL)** 🌐

#### **1.1 - Initializacja Projektu**
- `ng new raindrop-clone --style=scss --routing`
- Instalacja zależności: `@angular/fire`, `@angular/material`, `rxjs`
- Konfiguracja Firebase SDK
- Setup environment config (API keys)

#### **1.2 - Authentication Module**
- Login/Signup component (email + password)
- Firebase Auth integration
- AuthGuard dla protected routes
- Error handling (user exists, weak password, etc.)
- Persistent session (remember me logic)

#### **1.3 - Bootstrap User w Bazie**
- Po rejestracji → auto-create user record w `/users/{uid}`
- Auto-init `syncVersion` (version: 0)
- Default root folder (jeśli potrzebny)

#### **1.4 - View Bookmarks (Minimalna Lista)**
- Component wyświetlający hierarchię folderów + linki
- Real-time listen na `/bookmarks/{uid}`
- Obsługa loading/error states
- Basic rendering (bez wyszukiwania/sortowania)

#### **1.5 - Add Link Manual**
- Dialog/form: Folder + Link name + URL + Optional (icon, description, tags)
- Push do Firebase
- Refetch list z obserwatora

#### **1.6 - Add Folder Manual**
- Dialog: Folder name + Parent folder + Optional (icon, description, tags)
- Generowanie unique ID
- Push do Firebase
- Update parent's `children` array

#### **1.7 - UI/UX - Dark Mode**
- Material Dark Theme
- CSS Custom Properties dla colors
- Toggle dark/light mode
- Persist preference w localStorage

#### **1.8 - Mobile-First CSS**
- Responsive layout (mobile → tablet → desktop)
- Angular Material breakpoints
- Touch-friendly buttons
- Horizontal scroll na long lists (jeśli potrzebne)

---

### **FAZA 2: EXTENSION (CORE - BI-DIRECTIONAL SYNC)** 🔌

#### **2.1 - Setup Extension Project**
- Manifest V3 structure
```
extension/
├── manifest.json
├── background.ts (Service Worker)
├── content-script.ts
├── popup.html/ts
├── styles.scss
├── utils/
│   ├── firebase-config.ts
│   ├── sync-engine.ts
│   ├── bookmark-detector.ts
│   └── version-manager.ts
└── assets/
```

#### **2.2 - Firebase Auth w Extension**
- Content Script + Service Worker auth share
- Popup login (lub redirect do auth page)
- Token storage w `chrome.storage.sync`
- Auto-refresh token

#### **2.3 - Bookmark Detector**
- Listener na `chrome.bookmarks.onCreated/onRemoved/onChanged`
- Parser struktury bookmarków Chrome
- Flat → hierarchical conversion

#### **2.4 - Sync Engine (Conflict Resolution)**
```typescript
// Pseudocode
SyncEngine:
  - compareVersions(localBookmarks, dbBookmarks, syncVersion)
  - Jeśli DB version > local → pull latest z bazy
  - Jeśli local has new items → push do bazy
  - Jeśli conflict (both changed) → prefer newer timestamp
  - Update syncVersion po kazdej sync
  - Retry logic (exponential backoff)
```

#### **2.5 - Real-Time Listeners**
- Listen na `/bookmarks/{uid}` z Firebase
- Detect changes → update local bookmarks
- Bidirectional: Chrome bookmarks ↔️ Firebase

#### **2.6 - Version Management**
- Store `lastSyncVersion` w extension storage
- Metadata: `version`, `timestamp`, `source` (browser/import)
- Prevent unnecessary re-syncs

#### **2.7 - Popup UI**
- Login status display
- Last sync time
- Manual sync button
- Settings (auto-sync enabled/disabled)
- Link to web app

#### **2.8 - Background Service Worker**
- Periodic sync (co 30 min / on demand)
- Listen na Storage changes (multi-device sync)
- Handle offline scenarios (queue changes)
- Push notifications (optional: sync success/failure)

---

### **FAZA 3: INTEGRACJA & TESTING** ✅

#### **3.1 - End-to-End Sync Tests**
- Add bookmark w Chrome → pojawia się w web app
- Add link w web app → pojawia się w Chrome bookmarks
- Nested folders sync correctness
- Versioning accuracy

#### **3.2 - Conflict Resolution Testing**
- Modify same bookmark offline + online
- Multiple devices sync
- Merge scenarios

#### **3.3 - Performance Testing**
- Large bookmark trees (1000+)
- Real-time listener performance
- Sync latency measurements

#### **3.4 - Security Testing**
- Auth token expiry handling
- CORS (if applicable)
- Data privacy validation (only own data)

---

### **FAZA 4: DEPLOYMENT & MONITORING** 🚀

#### **4.1 - Web App Deploy**
- Firebase Hosting setup
- CI/CD pipeline (GitHub Actions)
- Production build optimization
- Error tracking (Sentry/Firebase Crashlytics optional)

#### **4.2 - Extension Deploy**
- Publish to Chrome Web Store
- Store listing optimization
- Privacy policy (per Chrome requirements)

#### **4.3 - Monitoring**
- Firebase Analytics events (login, sync, etc.)
- Error logging
- Performance metrics

---

### **FAZA 5: BONUS FEATURES (FUTURE)** 🎁

#### **5.1 - Import (z aplikacji webowej)**
- Upload JSON/HTML bookmark file
- Parser dla Raindrop export, Firefox export, itp.
- Merge strategy (overwrite vs. merge)
- Progress indicator

#### **5.2 - Web App Advanced** (gdy jest czas)
- Search (by name/URL/tags)
- Sorting (alphabetical, recently added)
- Edit/Delete links
- Bulk operations
- Export (JSON, HTML, Raindrop format)

#### **5.3 - Sharing** (później)
- Share folder/links z innymi użytkownikami
- Public links
- Permission levels (view/edit)

---

## **TIMELINE ORIENTACYJNY**

| Faza | Zadanie | Czas | Osób |
|------|---------|------|------|
| 0 | Setup Firebase + Repo | 2h | 1 |
| 1.1-1.3 | Auth + Bootstrap | 4h | 1 |
| 1.4-1.6 | View + Add Link/Folder | 6h | 1 |
| 1.7-1.8 | UI/Dark Mode/Mobile | 4h | 1 |
| **Faza 1 Total** | | **16h** | **1 osoba** |
| 2.1-2.2 | Extension setup + Auth | 3h | 1 |
| 2.3-2.4 | Bookmark detect + Sync engine | 8h | 1 |
| 2.5-2.6 | Real-time listeners + Version | 5h | 1 |
| 2.7-2.8 | Popup + Background Service Worker | 4h | 1 |
| **Faza 2 Total** | | **20h** | **1 osoba** |
| 3 | Testing (E2E + Conflict) | 6h | 1 |
| 4 | Deploy + Monitor | 4h | 1 |
| 5 | Bonus features (jeśli czas) | N/A | N/A |
| **RAZEM** | | **~50h** | **1 osoba** |

---

## **SETUP COMMANDS - QUICK START**

```bash
# Web App
ng new raindrop-clone --style=scss --routing
cd raindrop-clone
npm install @angular/fire @angular/material rxjs

# Extension (manual structure)
mkdir raindrop-extension
cd raindrop-extension
npm init -y
npm install typescript webpack webpack-cli ts-loader chrome-types

# Shared
npm install firebase

# Git
git init
git remote add origin https://github.com/your-username/raindrop-clone
```

---

## **PYTANIA IMPLEMENTACYJNE NA STARCIE**

1. **Chrome Extension Distribution:**
   - Czy chcesz publicować w Chrome Web Store (wymagane: developer account, $5 fee)?
   - Czy testowanie offline będzie na localhost ze unpacked extension?

2. **Offline Mode w Extension:**
   - Czy extension powinien być offline-capable (queue changes)?
   - Czy wystarczy "sync when online"?

3. **Bookmark Naming Conflicts:**
   - Co jeśli bookmarks w Chrome i Firebase mają różne nazwy dla tego samego URL?
   - Strategy: keep local lub merge?

4. **Default Folder Structure:**
   - Czy tworzysz domyślne foldery (np. "Saved", "Personal")?
   - Czy rozszerzyć na podstawie Chrome bookmark structure?

5. **Large Bookmark Trees:**
   - Czy pagination/lazy loading dla 1000+ linków?
   - Czy full tree load?

---

## **NEXT STEPS**

1. ✅ Zatwierdzić architekturę bazy danych
2. ✅ Setup Firebase Project (jeśli jeszcze nie istnieje)
3. ✅ Kezdy implementację Fazy 0 (infrastruktura)
4. ✅ Start Faza 1 (web app)
5. ✅ Parallel: Przygotować Manifest V3 + extension structure

**Czy coś jest niejasne? Mogę szczegółowo rozpisać dowolny punkt!** 🚀
