"""
Django Settings — Ingrevia / NutriScan
========================================
All sensitive values are read from environment variables via python-decouple.
Copy backend/.env.example → backend/.env and fill in the values.

Behaviour by environment:
  DEBUG=True  → development mode: CORS open, SQLite, all hosts allowed
  DEBUG=False → production mode: CORS locked to FRONTEND_URL, Postgres ready,
                ALLOWED_HOSTS enforced, strong password validators active
"""
from pathlib import Path
from urllib.parse import unquote, urlparse
from decouple import config, Csv

BASE_DIR = Path(__file__).resolve().parent.parent

# ── Core ───────────────────────────────────────────────────────────────────────
SECRET_KEY = config('SECRET_KEY')
DEBUG = config('DEBUG', default=True, cast=bool)

# In dev, accept any host. In production, enforce the ALLOWED_HOSTS list.
if DEBUG:
    ALLOWED_HOSTS = ['*']
else:
    ALLOWED_HOSTS = config('ALLOWED_HOSTS', cast=Csv())

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    # Local apps
    'users',
    'products',
    'history',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',   # must be first
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'nutriscan.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'nutriscan.wsgi.application'

# ── Database ───────────────────────────────────────────────────────────────────
def _database_from_url(database_url: str) -> dict:
    """Parse a provider DATABASE_URL into Django's DATABASES format."""
    parsed = urlparse(database_url)
    engine_by_scheme = {
        'postgres': 'django.db.backends.postgresql',
        'postgresql': 'django.db.backends.postgresql',
        'mysql': 'django.db.backends.mysql',
        'sqlite': 'django.db.backends.sqlite3',
    }
    engine = engine_by_scheme.get(parsed.scheme)
    if not engine:
        raise RuntimeError(f'Unsupported DATABASE_URL scheme: {parsed.scheme}')

    if engine == 'django.db.backends.sqlite3':
        return {
            'ENGINE': engine,
            'NAME': unquote(parsed.path.lstrip('/')) or BASE_DIR / 'db.sqlite3',
        }

    return {
        'ENGINE': engine,
        'NAME': unquote(parsed.path.lstrip('/')),
        'USER': unquote(parsed.username or ''),
        'PASSWORD': unquote(parsed.password or ''),
        'HOST': parsed.hostname or '',
        'PORT': str(parsed.port or ''),
    }


# Database
# DB_MODE=sqlite uses a local SQLite file for development/testing.
# DB_MODE=cloud uses DATABASE_URL or DB_ENGINE/DB_* values for managed databases.
DB_MODE = config('DB_MODE', default='sqlite').strip().lower()

if DB_MODE == 'sqlite':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': config('SQLITE_NAME', default=BASE_DIR / 'db.sqlite3'),
        }
    }
elif DB_MODE == 'cloud':
    DATABASE_URL = config('DATABASE_URL', default='').strip()
    if DATABASE_URL:
        DATABASES = {'default': _database_from_url(DATABASE_URL)}
    else:
        DATABASES = {
            'default': {
                'ENGINE': config('DB_ENGINE'),
                'NAME': config('DB_NAME'),
                'USER': config('DB_USER'),
                'PASSWORD': config('DB_PASSWORD'),
                'HOST': config('DB_HOST'),
                'PORT': config('DB_PORT', default='5432'),
            }
        }
else:
    raise RuntimeError('DB_MODE must be either "sqlite" or "cloud".')

if DB_MODE == 'cloud' and config('DB_SSL_REQUIRE', default=True, cast=bool):
    DATABASES['default'].setdefault('OPTIONS', {})
    DATABASES['default']['OPTIONS']['sslmode'] = 'require'

# ── Auth ───────────────────────────────────────────────────────────────────────
AUTH_USER_MODEL = 'users.User'

# Relaxed in dev, full validators in production
AUTH_PASSWORD_VALIDATORS = [] if DEBUG else [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ── Internationalisation ───────────────────────────────────────────────────────
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# ── Static files ───────────────────────────────────────────────────────────────
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ── Django REST Framework ──────────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '30/minute',
        'user': '1000/day',
    },
}

# ── CORS ───────────────────────────────────────────────────────────────────────
# Development: allow all origins (mobile dev server has a dynamic IP).
# Production:  restrict to the deployed frontend URL(s) set in FRONTEND_URL.
#
# FRONTEND_URL examples:
#   Single:   https://app.ingrevia.com
#   Multiple: https://app.ingrevia.com,https://staging.ingrevia.com
#
# React Native apps do NOT send an Origin header for regular API calls, so
# CORS mainly matters for the web build (expo start --web / EAS web).
# We keep CORS_ALLOW_ALL_ORIGINS=True in dev to avoid friction.

if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
else:
    CORS_ALLOW_ALL_ORIGINS = False
    _frontend_urls = config('FRONTEND_URL', default='').split(',')
    CORS_ALLOWED_ORIGINS = [u.strip() for u in _frontend_urls if u.strip()]

CORS_ALLOW_CREDENTIALS = True
