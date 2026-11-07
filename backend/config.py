"""Application configuration loaded from environment variables and .env file."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv
from pydantic import BaseModel, Field

# Load explicitly from project root if present to avoid OneDrive recursive search latency
env_path = Path(__file__).parent.parent / ".env"
if env_path.exists():
    load_dotenv(env_path)



class Settings(BaseModel):
    """Application settings sourced from environment variables."""

    # --- General ---
    APP_NAME: str = Field(default_factory=lambda: os.getenv("APP_NAME", "Voice Prescription Writer"))
    DEBUG: bool = Field(default_factory=lambda: os.getenv("DEBUG", "true").lower() == "true")
    FRONTEND_URL: str = Field(default_factory=lambda: os.getenv("FRONTEND_URL", "http://localhost:5173"))

    # --- Database ---
    DATABASE_URL: str = Field(default_factory=lambda: os.getenv("DATABASE_URL", "sqlite:///./voice_prescriptions.db"))
    DATABASE_PATH: str = Field(default_factory=lambda: os.getenv("DATABASE_PATH", "./voice_prescriptions.db"))

    # --- File Storage ---
    UPLOAD_DIR: str = Field(default_factory=lambda: os.getenv("UPLOAD_DIR", "./uploads"))
    PDF_OUTPUT_DIR: str = Field(default_factory=lambda: os.getenv("PDF_OUTPUT_DIR", "./pdf_output"))

    # --- STT Provider ---
    STT_PROVIDER: str = Field(default_factory=lambda: os.getenv("STT_PROVIDER", "mock"))
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = Field(default_factory=lambda: os.getenv("GOOGLE_APPLICATION_CREDENTIALS"))
    DEEPGRAM_API_KEY: Optional[str] = Field(default_factory=lambda: os.getenv("DEEPGRAM_API_KEY"))

    # --- LLM Provider ---
    LLM_PROVIDER: str = Field(default_factory=lambda: os.getenv("LLM_PROVIDER", "mock"))
    OPENAI_API_KEY: Optional[str] = Field(default_factory=lambda: os.getenv("OPENAI_API_KEY"))
    OPENAI_MODEL: str = Field(default_factory=lambda: os.getenv("OPENAI_MODEL", "gpt-4o"))
    GEMINI_API_KEY: Optional[str] = Field(default_factory=lambda: os.getenv("GEMINI_API_KEY"))
    GEMINI_MODEL: str = Field(default_factory=lambda: os.getenv("GEMINI_MODEL", "gemini-2.5-flash"))

    # --- PDF ---
    CLINIC_NAME: str = Field(default_factory=lambda: os.getenv("CLINIC_NAME", "Voice Prescription Writer - Demo Clinic"))
    DOCTOR_NAME: str = Field(default_factory=lambda: os.getenv("DOCTOR_NAME", "Dr. Demo Physician, MD"))
    DOCTOR_REGISTRATION: str = Field(default_factory=lambda: os.getenv("DOCTOR_REGISTRATION", "MCI-DEMO-12345"))

    @property
    def upload_path(self) -> Path:
        """Resolved upload directory path."""
        p = Path(self.UPLOAD_DIR)
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def pdf_output_path(self) -> Path:
        """Resolved PDF output directory path."""
        p = Path(self.PDF_OUTPUT_DIR)
        p.mkdir(parents=True, exist_ok=True)
        return p


def get_settings() -> Settings:
    """Return a fresh Settings instance."""
    return Settings()
