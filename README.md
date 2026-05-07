# Ingrevia Setup

This repository contains a Django REST backend and an Expo React Native frontend.
The code is configured to avoid machine-specific paths. Secrets and deployment
endpoints live in local `.env` files that are ignored by git.

## Prerequisites

- Python 3.11 or newer
- Node.js 20 or newer
- npm
- Expo CLI through `npx expo`

## Backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
# Edit .env and set SECRET_KEY before continuing.
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

On macOS/Linux:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env and set SECRET_KEY before continuing.
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

`backend/.env` is required because Django needs `SECRET_KEY`. Keep real values
there for `SECRET_KEY`, `GOOGLE_API_KEY`, and production database settings.

### Switching Databases

Database selection is controlled by `backend/.env`; no code changes are needed.

For local testing with SQLite:

```env
DB_MODE=sqlite
# Optional. Leave blank to use backend/db.sqlite3.
# SQLITE_NAME=
```

Then run:

```bash
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

For a cloud PostgreSQL database, use `DB_MODE=cloud`. If your provider gives a
single connection string, prefer `DATABASE_URL`:

```env
DB_MODE=cloud
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME
DB_SSL_REQUIRE=True
```

If your provider gives separate fields instead, leave `DATABASE_URL` blank and
set the individual variables:

```env
DB_MODE=cloud
DATABASE_URL=
DB_ENGINE=django.db.backends.postgresql
DB_NAME=app_db
DB_USER=app_user
DB_PASSWORD=your-cloud-password
DB_HOST=db.example.com
DB_PORT=5432
DB_SSL_REQUIRE=True
```

After switching database modes, run migrations against the selected database:

```bash
python manage.py migrate
```

Keep cloud credentials only in `backend/.env`, deployment environment variables,
or CI secrets. Do not commit real database URLs or passwords.

## Frontend

```powershell
cd FRONTEND
npm install
npm start
```

The app auto-detects the Expo Metro host and points API calls to the Django
server on port `8000`. If that fails on a specific network, copy
`FRONTEND/.env.example` to `FRONTEND/.env` and set:

```env
EXPO_PUBLIC_DEV_API_URL=http://YOUR_MACHINE_IP:8000
```

For production builds, set `EXPO_PUBLIC_API_URL` through your local
`FRONTEND/.env`, EAS environment variables, or CI secrets.

## Codebase Guide

The project is split into two main applications:

- `backend/` - Django REST API, authentication, product lookup, AI analysis, and scan history.
- `FRONTEND/` - Expo React Native app for login, search, scanning, product detail, profile, and history UI.

### Backend Structure

`backend/manage.py` is Django's command-line entry point. Use it for migrations,
tests, local server startup, and project checks.

`backend/requirements.txt` lists Python dependencies used by the API. Important
packages include Django, Django REST Framework, token auth, CORS headers,
python-decouple for `.env` loading, requests, and Google GenAI.

`backend/.env.example` documents the environment variables the backend expects.
Real values belong in `backend/.env`, which is ignored by git.

`backend/nutriscan/` is the Django project configuration:

- `settings.py` loads environment variables, configures apps, database, auth,
  REST framework, CORS, static files, and password validation.
- `urls.py` mounts the API modules under `/api/auth/`, `/api/products/`, and
  `/api/history/`.
- `asgi.py` and `wsgi.py` expose the app for ASGI/WSGI servers.
- `nutriscan/settings.py` inside the nested folder is only a compatibility
  wrapper so stale imports still reach the active settings module.

`backend/users/` owns account and profile behavior:

- `models.py` defines the custom `User` model. Email is the login identifier,
  and profile fields include demographics, health goals, dietary restrictions,
  and allergens.
- `serializers.py` converts user models to/from API JSON and handles account
  creation.
- `views.py` implements register, login, logout, and profile endpoints.
- `urls.py` maps auth routes.
- `migrations/` stores database schema changes for the user model.
- `tests.py` covers register, login, profile, duplicate email, and logout token
  invalidation.

`backend/products/` owns product search, barcode lookup, and AI analysis:

- `views.py` exposes product endpoints. It calls Open Food Facts for search and
  barcode data, normalizes external responses, and delegates image analysis to
  `ai_service.py`.
- `ai_service.py` wraps Gemini setup and calls. The client is created lazily so
  the backend can start even when AI credentials are not configured.
- `prompts.py` stores prompt templates for label analysis, barcode extraction,
  and AI fallback search.
- `urls.py` maps product routes.
- `tests.py` covers barcode lookup and barcode-image analysis behavior.

`backend/history/` owns the user's scan history:

- `models.py` defines `ScanHistory`, one product entry per user/product pair.
- `serializers.py` shapes history entries for API responses.
- `views.py` implements list, add/update, clear-all, and delete-one endpoints.
- `urls.py` maps history routes.
- `tests.py` covers add, update, list, and clear behavior.

### Frontend Structure

`FRONTEND/package.json` defines the Expo scripts and JavaScript dependencies.
Use `npm start` for Metro, `npm run android` for Android, and `npm run web` for
the web build.

`FRONTEND/.env.example` documents public Expo environment variables. Real local
values belong in `FRONTEND/.env`, and production values should come from EAS or
CI secrets.

`FRONTEND/app/` contains Expo Router screens:

- `_layout.tsx` wires the root providers, auth guard, stack navigation, and
  status bar.
- `index.tsx` is the splash screen. It waits for auth restore and redirects to
  login or tabs.
- `login.tsx` and `register.tsx` call auth context methods and show auth forms.
- `scan.tsx` handles camera permission, barcode scanning, gallery picking,
  ingredient-label capture, AI analysis, and search suggestions.
- `product-detail.tsx` displays the selected product and writes it to history.
- `error-screen.tsx` is the fallback/error UI.
- `app/(tabs)/` contains the authenticated tab screens: home/search/history,
  scan tab routing, and profile.

`FRONTEND/constants/` contains shared app state and API configuration:

- `config.ts` resolves the backend base URL. In development it auto-detects the
  Expo host or uses `EXPO_PUBLIC_DEV_API_URL`; in production it uses
  `EXPO_PUBLIC_API_URL`.
- `api.ts` is the HTTP client layer. It stores/clears auth tokens, adds token
  headers, handles JSON parsing, timeout behavior, and exposes Auth, Products,
  and History API wrappers.
- `AuthContext.tsx` owns logged-in user state, session restore, login,
  registration, and logout.
- `ProductContext.tsx` stores the currently selected product between screens.
- `ThemeContext.tsx` and `Colors.ts` provide app colors/theme state.

`FRONTEND/components/` contains reusable UI:

- `SearchBar.tsx` is the shared controlled search input.
- `ProductCard.tsx` renders product rows in search results and suggestions.
- `NutriScoreBadge.tsx` renders Nutri-Score labels.
- `EmptyState.tsx` renders reusable empty/placeholder states.
- `LogoBranding.tsx` renders app branding.

`FRONTEND/hooks/` contains reusable screen logic:

- `useSearch.ts` handles product search state, debouncing, pagination, and
  fallback searches.
- `useHistory.ts` loads scan history, clears history, and reopens history items.

`FRONTEND/utils/productMapper.ts` converts backend `NormalizedProduct` objects
from `api.ts` into the frontend `ProductData` shape used by `ProductContext` and
the detail screen.

`FRONTEND/assets/` stores app icons, splash images, and other bundled assets.

`FRONTEND/android/` is generated native Android project configuration for Expo
prebuild/native runs. Most feature work should happen in `app/`, `components/`,
`constants/`, `hooks/`, and `utils/`.

### How The Pieces Interact

Authentication flow:

1. The login/register screens call `AuthContext`.
2. `AuthContext` calls `AuthAPI` in `constants/api.ts`.
3. `AuthAPI` sends requests to Django `/api/auth/...` routes.
4. `backend/users/views.py` validates credentials, creates or fetches a DRF
   token, and returns the token plus serialized user profile.
5. The frontend stores the token in AsyncStorage and attaches it to future API
   requests as `Authorization: Token <token>`.

Product search flow:

1. Home or scan search UI calls `useSearch` or `ProductsAPI.search`.
2. `api.ts` sends `GET /api/products/search/`.
3. `backend/products/views.py` calls Open Food Facts, normalizes product data,
   and returns a list of `NormalizedProduct` objects.
4. The frontend renders those with `ProductCard`.
5. When a product is selected, `productMapper.ts` maps it into `ProductData`,
   `ProductContext` stores it, and `product-detail.tsx` displays it.

Barcode/camera flow:

1. `scan.tsx` uses `expo-camera` for live barcode scanning or captures/picks an
   image.
2. For a live barcode, the app calls `ProductsAPI.byBarcode`, which reaches
   `/api/products/barcode/<code>/`.
3. For a barcode image or ingredient label, the app calls the AI analysis
   endpoints.
4. `backend/products/ai_service.py` uses Gemini when `GOOGLE_API_KEY` is
   configured.
5. Returned product data is normalized and shown in `product-detail.tsx`.

History flow:

1. `product-detail.tsx` calls `HistoryAPI.add` when a product is opened.
2. `backend/history/views.py` creates or refreshes the user's history row.
3. Home uses `useHistory` to load `/api/history/`, display recent products, and
   reopen them through `ProductsAPI.byBarcode` when possible.

## Portable Files

Do not commit generated machine-local folders or secrets:

- `backend/venv/`
- `FRONTEND/node_modules/`
- `backend/.env`
- `FRONTEND/.env`
- `backend/db.sqlite3`
