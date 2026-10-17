"""Aerify AI Backend Configuration & Settings.

Strictly follows Architecture Revision 0.10 & Schema 0.9:
- GCP Project: aerifyai
- Database: Cloud SQL PostgreSQL 15 + PostGIS 3.3+ via Cloud SQL Python Connector + IAM Auth (zero static DB passwords)
- Vertex AI Gemini: gemini-2.5-flash-lite via ADC (roles/aiplatform.user, zero API keys)
"""
from __future__ import annotations

import os
import subprocess
from functools import lru_cache
from typing import Literal

import google.auth
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="AERIFY_",
        case_sensitive=False,
        extra="ignore",
    )

    project_id: str = os.environ.get("GOOGLE_CLOUD_PROJECT", "aerifyai")
    region: str = os.environ.get("AERIFY_REGION", "asia-south1")
    instance_connection_name: str = os.environ.get(
        "AERIFY_INSTANCE_CONNECTION_NAME", "aerifyai:asia-south1:aerify-postgis-db"
    )
    db_name: str = os.environ.get("AERIFY_DB_NAME", "aerify_db")
    db_iam_user: str | None = os.environ.get("AERIFY_DB_IAM_USER", None)

    # Storage buckets
    raw_payloads_bucket: str = os.environ.get("AERIFY_RAW_BUCKET", "aerifyai-raw-payloads")
    public_artifacts_bucket: str = os.environ.get("AERIFY_PUBLIC_BUCKET", "aerifyai-public-artifacts")
    media_restricted_bucket: str = os.environ.get("AERIFY_MEDIA_BUCKET", "aerifyai-media-restricted")

    # Cloud Tasks
    tasks_queue_name: str = os.environ.get("AERIFY_TASKS_QUEUE", "aerify-action-evaluations-queue")
    worker_service_url: str | None = os.environ.get("AERIFY_WORKER_URL", None)

    # Vertex AI Gemini Configuration (No API keys allowed)
    gemini_model_id: str = os.environ.get("AERIFY_GEMINI_MODEL", "gemini-2.5-flash-lite")
    gemini_fallback_model_id: str = os.environ.get("AERIFY_GEMINI_FALLBACK_MODEL", "gemini-3.5-flash-lite")
    gemini_daily_call_limit: int = int(os.environ.get("AERIFY_GEMINI_DAILY_CALL_LIMIT", "250"))
    gemini_daily_token_limit: int = int(os.environ.get("AERIFY_GEMINI_DAILY_TOKEN_LIMIT", "500000"))

    # Default clock mode
    default_clock_mode: Literal["REAL", "SCENARIO", "TEST"] = "SCENARIO"
    schema_version: str = "0.9"

    def resolve_iam_db_user(self) -> str:
        """Resolve the Cloud SQL IAM database username from ADC or environment."""
        if self.db_iam_user:
            return self.db_iam_user
        try:
            credentials, _ = google.auth.default()
            sa_email = getattr(credentials, "service_account_email", None)
            if sa_email and sa_email != "default":
                # Cloud SQL IAM service account user format omits '.gserviceaccount.com'
                if sa_email.endswith(".gserviceaccount.com"):
                    return sa_email[: -len(".gserviceaccount.com")]
                return sa_email
        except Exception:
            pass
        try:
            acct = subprocess.check_output(
                ["gcloud", "config", "get-value", "account"],
                text=True,
                shell=(os.name == "nt"),
                stderr=subprocess.DEVNULL,
            ).strip()
            if acct:
                return acct
        except Exception:
            pass
        return f"aerify-api-sa@{self.project_id}.iam"


@lru_cache
def get_settings() -> Settings:
    return Settings()
