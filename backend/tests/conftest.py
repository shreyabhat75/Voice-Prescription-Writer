"""Pytest configuration and shared fixtures for Voice Prescription Writer backend tests."""

from __future__ import annotations

import os

# Ensure tests always use deterministic mock providers without external network dependencies
os.environ["STT_PROVIDER"] = "mock"
os.environ["LLM_PROVIDER"] = "mock"
os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["DATABASE_PATH"] = "./test.db"

import asyncio
import inspect
import shutil
import tempfile

import pytest
from httpx import ASGITransport, AsyncClient

from backend.config import get_settings
from backend.database import init_db
from backend.main import app

os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["DATABASE_PATH"] = "./test.db"


def pytest_pyfunc_call(pyfuncitem):
    """Enable seamless async test functions without requiring pytest-asyncio."""
    testfunction = pyfuncitem.obj
    if inspect.iscoroutinefunction(testfunction):
        argnames = pyfuncitem._fixtureinfo.argnames
        funcargs = {arg: pyfuncitem.funcargs[arg] for arg in argnames if arg in pyfuncitem.funcargs}

        async def runner():
            if "async_client" in funcargs:
                db_path = os.environ.get("DATABASE_PATH", "./test.db")
                await init_db(db_path)
                transport = ASGITransport(app=app)
                async with AsyncClient(transport=transport, base_url="http://test") as client:
                    funcargs["async_client"] = client
                    if pyfuncitem.instance is not None:
                        await testfunction(pyfuncitem.instance, **funcargs)
                    else:
                        await testfunction(**funcargs)
            else:
                if pyfuncitem.instance is not None:
                    await testfunction(pyfuncitem.instance, **funcargs)
                else:
                    await testfunction(**funcargs)

        asyncio.run(runner())
        return True
    return None


@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    """Configure environment variables for tests."""
    temp_dir = tempfile.mkdtemp()
    test_db = os.path.join(temp_dir, "test.db")
    os.environ["DATABASE_PATH"] = test_db
    os.environ["DATABASE_URL"] = f"sqlite:///{test_db}"
    os.environ["UPLOAD_DIR"] = os.path.join(temp_dir, "uploads")
    os.environ["PDF_OUTPUT_DIR"] = os.path.join(temp_dir, "pdf_output")
    os.environ["STT_PROVIDER"] = "mock"
    os.environ["LLM_PROVIDER"] = "mock"

    yield

    shutil.rmtree(temp_dir, ignore_errors=True)


@pytest.fixture
def async_client():
    """Provide an asynchronous HTTP client wired to the FastAPI ASGI application."""
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")
