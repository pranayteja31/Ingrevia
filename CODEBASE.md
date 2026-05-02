# Ingrevia (NutriScan) — Codebase Reference

> **What is this app?**  
> Ingrevia is a mobile food-nutrition scanner built with **React Native / Expo** (frontend) and **Django REST Framework** (backend). Users search for food products, scan barcodes, or photograph ingredient labels to get instant nutritional analysis powered by Open Food Facts and Google Gemini AI.

---

## Repository Layout

```
INTERNSHIP/
├── FRONTEND/          ← Expo React Native app
└── backend/           ← Django REST API
```

---

## Frontend (`FRONTEND/`)

**Runtime:** Expo SDK 54, React Native 0.81, TypeScript  
**Router:** expo-router (file-based, similar to Next.js)  
**Entry point:** `index.ts` → `expo-router/entry`

### `app/` — Screens (file = route)

| File | Route | Purpose |
|---|---|---|
| `index.tsx` | `/` | **Splash screen.** Plays logo animation, then redirects to `/(tabs)` if authenticated or `/login` if not. |
| `login.tsx` | `/login` | **Login screen.** Email + password form. Calls `AuthAPI.login`, stores token, navigates to home. |
| `register.tsx` | `/register` | **Register screen.** Name + email + password form. Calls `AuthAPI.register`. |
| `scan.tsx` | `/scan` | **Scanner screen.** Two modes — *Barcode* (live camera scan via CameraView) and *Ingredients Label* (photo → Gemini AI). Also has a floating product search bar. |
| `product-detail.tsx` | `/product-detail` | **Product detail screen.** Shows nutritional facts table and ingredient list for the `currentProduct` set in `ProductContext`. Adds to backend history on open. |
| `error-screen.tsx` | `/error-screen` | **Error screen.** Shown when the app can't start (network/server issue). Has animated shake icon and retry button. |
| `_layout.tsx` | Root layout | Wraps entire app in `SafeAreaProvider`, `ThemeProvider`, `AuthProvider`, `ProductProvider`. Contains `AuthGuard` which redirects unauthenticated users to `/login`. |

### `app/(tabs)/` — Tab Navigator Screens

| File | Tab | Purpose |
|---|---|---|
| `index.tsx` | Home | **Home tab.** Product search with live debouncing + pagination, pre-search hero cards, and scan history pulled from the backend. |
| `profile.tsx` | Profile | **Profile tab.** Shows user details (age, weight, BMI, health goals, allergens), dark/light mode toggle, and sign-out. |
| `_layout.tsx` | Tab bar | Custom 3-button tab bar: Home icon → FAB scan button (navigates to `/scan`) → Profile icon. |
| `history.tsx` | *(draft — not mounted)* | **Reference only.** A standalone history screen built before the backend API existed. Reads from AsyncStorage (old approach). Not wired into the tab navigator and not reachable by users. The real history is in `(tabs)/index.tsx`. |

---

### `components/` — Reusable UI Components

| File | Purpose |
|---|---|
| `NutriScoreBadge.tsx` | Displays an **A–E Nutri-Score** grade badge with the official colour (green→red). Accepts `size='sm'` or `'md'`. |
| `ProductCard.tsx` | Single food product row: image + name + brand + kcal + `NutriScoreBadge`. Two variants: `compact=false` (bordered card in search results) and `compact=true` (padding-only row in scan suggestions). |
| `SearchBar.tsx` | Controlled text input with search icon, clear button, and optional "Cancel" text. Theme-aware; exposes a `focused` prop to change border colour. Used on Home and Scan screens. |
| `EmptyState.tsx` | Generic empty/placeholder UI. Shows emoji + title + optional subtitle + optional CTA button. Supports `card=true` (bordered card) or full-screen centred layout. |
| `LogoBranding.tsx` | The 🥬 logo circle + "NutriScan" name + tagline. Shared between Login and Register screens. |

---

### `hooks/` — Custom React Hooks

| File | Purpose |
|---|---|
| `useSearch.ts` | Encapsulates debounced product search. Returns query state, results, loading/pagination flags, and `handleSearch`, `handleLoadMore`, `searchCustom` (for AI fallback). Used by the Home tab. |
| `useHistory.ts` | Encapsulates backend scan-history operations: `loadHistory`, `clearHistory`, and `getProductForEntry` (fetches full product or falls back to minimal data). Used by the Home tab. |

---

### `constants/` — Shared State and Configuration

| File | Purpose |
|---|---|
| `api.ts` | **All API calls.** Single `apiFetch` helper (handles auth token, JSON parsing, error extraction). Exports `AuthAPI`, `ProductsAPI`, and `HistoryAPI` namespaces plus TypeScript interfaces (`NormalizedProduct`, `HistoryEntry`, `UserProfile`). |
| `AuthContext.tsx` | **Auth state** (`user`, `isLoading`). Provides `login`, `register`, `logout` functions. Restores session from AsyncStorage token on app start. |
| `ProductContext.tsx` | **Cross-screen product passing.** Holds `currentProduct` (the product being viewed). Screens set this before navigating to `product-detail`. |
| `ThemeContext.tsx` | **Light/dark theme.** Provides `colors`, `isDark`, `toggleTheme`. Defaults to dark mode. |
| `Colors.ts` | **Color palettes.** Exports `DarkColors`, `LightColors`, and `Colors` (dark alias for backward compat). All screens must use `useTheme().colors` — never import `Colors` directly. |
| `config.ts` | **Runtime config.** `BASE_URL` is auto-resolved from Expo's Metro bundler host in dev, or `PRODUCTION_API_URL` in production. Also exports `APP_VERSION`. |

---

### `utils/` — Pure Utility Functions

| File | Purpose |
|---|---|
| `productMapper.ts` | `normalizedToProductData(p)` — converts a `NormalizedProduct` (API shape) to a `ProductData` (in-app shape). Used everywhere a product is opened. |

---

### `assets/` — Static Assets

| File | Purpose |
|---|---|
| `icon.png` | App icon (Android/iOS launcher) |
| `adaptive-icon.png` | Android adaptive icon |
| `splash-icon.png` | Splash screen icon |
| `favicon.png` | Web favicon (for `expo start --web`) |

---

### Key Config Files

| File | Purpose |
|---|---|
| `package.json` | Dependencies and npm scripts (`start`, `android`, `ios`, `web`) |
| `app.json` | Expo app config (name, bundle IDs, permissions) |
| `tsconfig.json` | TypeScript config — strict mode enabled |
| `eas.json` | EAS Build config for cloud builds |
| `expo-env.d.ts` | Expo global type declarations |
| `declarations.d.ts` | Custom module declarations |

---

## Backend (`backend/`)

**Runtime:** Python / Django 5, Django REST Framework  
**Auth:** Token-based (`rest_framework.authtoken`)  
**Database:** SQLite (dev) — swap to PostgreSQL for production

### `nutriscan/` — Django Project Core

| File | Purpose |
|---|---|
| `settings.py` | Django settings: installed apps, middleware, database, DRF config, CORS (all origins allowed in dev). Uses `python-decouple` for env vars. |
| `urls.py` | Root URL config. Routes `/api/auth/` → `users`, `/api/products/` → `products`, `/api/history/` → `history`. |
| `wsgi.py` / `asgi.py` | Standard Django WSGI/ASGI entry points |

---

### `users/` — Auth App

| File | Purpose |
|---|---|
| `models.py` | Custom `User` model (extends `AbstractUser`). Login field = `email`. Extra fields: `name`, `age`, `gender`, `weight_kg`, `height_cm`, `health_goals`, `dietary_restrictions` (comma-string), `known_allergens` (JSON array). |
| `serializers.py` | `RegisterSerializer` (creates user, auto-generates `username` from email prefix). `UserProfileSerializer` (full profile read/write, exposes `dietary_restrictions_list` as a computed list). |
| `views.py` | `POST /api/auth/register/`, `POST /api/auth/login/`, `POST /api/auth/logout/`, `GET/PUT /api/auth/profile/` |
| `urls.py` | URL patterns for the users app |
| `admin.py` | Django admin registration |

---

### `products/` — Food Data App

| File | Purpose |
|---|---|
| `views.py` | Four endpoints (see table below). Contains `_normalize_product()` helper that maps Open Food Facts raw JSON → the app's `NormalizedProduct` schema. |
| `ai_service.py` | **Gemini AI integration.** `analyze_label_image()` sends an ingredient photo to Gemini and parses the JSON response. `extract_barcode()` reads a barcode digit string from a photo. `search_indian_products()` asks Gemini for Indian food product data when Open Food Facts returns nothing. |
| `prompts.py` | All Gemini prompt strings in one place. Edit here to tune AI behaviour without touching view or service logic. |
| `urls.py` | URL patterns for the products app |

#### Product API Endpoints

| Method | URL | Description |
|---|---|---|
| `GET` | `/api/products/search/?q=…&page=1&page_size=20` | Search Open Food Facts. Falls back to Gemini AI for Indian products if no results. |
| `GET` | `/api/products/barcode/<barcode>/` | Fetch product by EAN/UPC barcode from Open Food Facts. |
| `POST` | `/api/products/analyze-label/` | Send `{image: base64, product_name?: string}` → Gemini AI parses the ingredient label. |
| `POST` | `/api/products/analyze-barcode/` | Send `{image: base64}` → Gemini extracts the barcode, then fetches product data. |

---

### `history/` — Scan History App

| File | Purpose |
|---|---|
| `models.py` | `ScanHistory` model: `user` (FK), `product_id`, `name`, `brand`, `image_url`, `scanned_at`. Unique together on `(user, product_id)` — re-scanning updates `scanned_at` instead of duplicating. |
| `serializers.py` | `ScanHistorySerializer` — standard DRF serializer |
| `views.py` | `GET/POST/DELETE /api/history/` (list, add/upsert, clear all) and `DELETE /api/history/<id>/` (delete one item). |
| `urls.py` | URL patterns for the history app |

---

### Key Backend Files

| File | Purpose |
|---|---|
| `requirements.txt` | Python dependencies: Django, DRF, django-cors-headers, python-decouple, requests, google-genai |
| `.env` | Environment variables (not in git): `SECRET_KEY`, `DEBUG`, `GOOGLE_API_KEY`, `ALLOWED_HOSTS` |
| `manage.py` | Standard Django management script |
| `db.sqlite3` | SQLite database file (dev only — not committed to git) |

---

## Data Flow

```
User Action
    │
    ▼
React Native Screen
    │  calls
    ▼
constants/api.ts  (apiFetch + AuthAPI / ProductsAPI / HistoryAPI)
    │  HTTP request with Token auth
    ▼
Django REST API
    ├── users/views.py      → Auth operations
    ├── products/views.py   → OFF search + barcode lookup
    │       └── ai_service.py → Gemini AI (label/barcode analysis)
    └── history/views.py    → Scan history CRUD
```

---

## Environment Setup

### Frontend
```bash
cd FRONTEND
npm install

# 1. Copy the env template (only needed for manual IP override or production URLs)
cp .env.example .env.local

# 2. Start the dev server — BASE_URL auto-detects your machine's LAN IP
npx expo start          # scan QR with Expo Go app on your phone
npx expo start --web    # browser preview
```

### Backend
```bash
cd backend
python -m venv venv && venv\Scripts\activate   # Windows
# python -m venv venv && source venv/bin/activate  # macOS/Linux

pip install -r requirements.txt

# 1. Copy the env template
cp .env.example .env
# 2. Fill in SECRET_KEY and GOOGLE_API_KEY at minimum

python manage.py migrate
python manage.py runserver 0.0.0.0:8000   # 0.0.0.0 makes it reachable from your phone
```

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `SECRET_KEY` | ✅ always | — | Django secret key. Generate with `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` |
| `DEBUG` | ✅ always | `False` | `True` for development, `False` for production |
| `ALLOWED_HOSTS` | ✅ in prod | — | Comma-separated hostnames/IPs. Ignored when `DEBUG=True`. Example: `api.ingrevia.com` |
| `GOOGLE_API_KEY` | ✅ always | — | Gemini API key from [Google AI Studio](https://aistudio.google.com) |
| `FRONTEND_URL` | ✅ in prod | — | Comma-separated frontend origin URLs for CORS. Ignored when `DEBUG=True`. Example: `https://app.ingrevia.com` |
| `DB_ENGINE` | ➖ optional | SQLite | Set to `django.db.backends.postgresql` for production |
| `DB_NAME` | ➖ prod only | — | PostgreSQL database name |
| `DB_USER` | ➖ prod only | — | PostgreSQL user |
| `DB_PASSWORD` | ➖ prod only | — | PostgreSQL password |
| `DB_HOST` | ➖ prod only | `localhost` | PostgreSQL host |
| `DB_PORT` | ➖ prod only | `5432` | PostgreSQL port |

### Frontend (`FRONTEND/.env.local` for dev, EAS profile for production)

| Variable | Required | Description |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | ✅ in prod | Full URL of the deployed backend. Set in `eas.json` build profiles or CI. Example: `https://api.ingrevia.com` |
| `EXPO_PUBLIC_DEV_API_URL` | ➖ optional | Override the auto-detected dev URL. Only needed if Metro's IP auto-detection fails (VPN, WSL, custom tunnels). Example: `http://192.168.1.42:8000` |

---

## How the Frontend Connects to the Backend

### Local Development (automatic)
```
Expo Metro bundler starts on your machine at e.g. 192.168.1.42:8081
↓
config.ts reads Constants.expoConfig.hostUri → "192.168.1.42:8081"
↓
Strips port → BASE_URL = "http://192.168.1.42:8000"
↓
Django dev server must be running on 0.0.0.0:8000
```
**No manual IP configuration needed** — just run both servers and it works.

### Manual Dev Override
If auto-detection fails, set `EXPO_PUBLIC_DEV_API_URL=http://<your-ip>:8000` in `FRONTEND/.env.local`.

### Production (EAS Build)
```
EXPO_PUBLIC_API_URL=https://api.ingrevia.com  set in eas.json → build env
↓
config.ts returns EXPO_PUBLIC_API_URL as BASE_URL
↓
All API calls go to https://api.ingrevia.com/api/...
```

### CORS
- **Dev (`DEBUG=True`)**: All origins allowed — no config needed.
- **Production (`DEBUG=False`)**: Only origins listed in `FRONTEND_URL` are allowed. Set `FRONTEND_URL=https://app.ingrevia.com` in the backend `.env`.

> **Note:** React Native apps (physical devices) do **not** send an `Origin` header for API calls — CORS restrictions only apply to the web build (`expo start --web`). The `FRONTEND_URL` setting is primarily for your web deployment.

