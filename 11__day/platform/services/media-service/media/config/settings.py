import os
from pathlib import Path

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Django
    SECRET_KEY: str = "django-insecure-change-in-production"
    DEBUG: bool = True
    ALLOWED_HOSTS: list[str] = ["*"]

    # Database
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "media_db"  # Use media_db as default to align with init schema
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "postgres"

    # S3/Garage
    S3_ENDPOINT_URL: str = "http://localhost:3900"
    S3_ACCESS_KEY: str = "garage"
    S3_SECRET_KEY: str = "garage"
    S3_BUCKET: str = "media"
    S3_REGION: str = "us-east-1"
    CDN_BASE_URL: str = "http://localhost:4000/media"

    # Kafka
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    KAFKA_TOPIC_UPLOAD_COMPLETED: str = "media.upload.completed"

    # Upload
    MAX_UPLOAD_SIZE: int = 20 * 1024 * 1024 * 1024  # 20 GB
    UPLOAD_SESSION_EXPIRY_HOURS: int = 24

    # OpenTelemetry
    OTEL_EXPORTER_OTLP_ENDPOINT: str = "http://localhost:4317"


settings = Settings()


SECRET_KEY = settings.SECRET_KEY
DEBUG = settings.DEBUG
ALLOWED_HOSTS = settings.ALLOWED_HOSTS

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "media.upload.domain.apps.UploadDomainConfig",
    "media.upload.application.apps.UploadApplicationConfig",
    "media.video.domain.apps.VideoDomainConfig",
    "media.video.application.apps.VideoApplicationConfig",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "media.config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "media.config.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "HOST": settings.DB_HOST,
        "PORT": settings.DB_PORT,
        "NAME": settings.DB_NAME,
        "USER": settings.DB_USER,
        "PASSWORD": settings.DB_PASSWORD,
    },
    "course_db": {
        "ENGINE": "django.db.backends.postgresql",
        "HOST": settings.DB_HOST,
        "PORT": settings.DB_PORT,
        "NAME": "courses_db",
        "USER": settings.DB_USER,
        "PASSWORD": settings.DB_PASSWORD,
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "media.common.auth.GatewayHeaderAuthentication",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 100,
}
