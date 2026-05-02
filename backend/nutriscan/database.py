from pathlib import Path
from decouple import config

# BASE_DIR is needed for SQLite default path
BASE_DIR = Path(__file__).resolve().parent.parent

# ── Database Configuration ──────────────────────────────────────────────────────
# Organizations can edit this file to configure their preferred external database.
# 
# Development default: SQLite (zero config)
# Production default:  Read from environment variables (DB_ENGINE, DB_NAME, etc.)
#
# You can customize the DATABASES dictionary below to fit your cloud provider's
# exact requirements (e.g., AWS RDS, Heroku Postgres, Google Cloud SQL, etc.)

DB_ENGINE = config('DB_ENGINE', default='').strip()

if not DB_ENGINE or DB_ENGINE == 'django.db.backends.sqlite3':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
else:
    # Example: PostgreSQL / MySQL for production
    DATABASES = {
        'default': {
            'ENGINE': DB_ENGINE,
            'NAME':     config('DB_NAME'),
            'USER':     config('DB_USER'),
            'PASSWORD': config('DB_PASSWORD'),
            'HOST':     config('DB_HOST', default='localhost'),
            'PORT':     config('DB_PORT', default='5432'),
        }
    }
