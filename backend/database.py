"""Async SQLite database layer using built-in sqlite3.

Provides an aiosqlite-compatible interface without external thread deadlock issues in Python 3.13.
"""

from __future__ import annotations

import logging
import sqlite3
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, AsyncGenerator

from backend.config import get_settings

logger = logging.getLogger(__name__)

_db_path: str | None = None


def _resolve_db_path() -> str:
    """Return the resolved database file path from settings."""
    settings = get_settings()
    return settings.DATABASE_PATH


def _load_migration_sql() -> str:
    """Read the init.sql migration file."""
    migration_path = Path(__file__).parent / "data" / "migrations" / "init.sql"
    if not migration_path.exists():
        raise FileNotFoundError(f"Migration file not found: {migration_path}")
    return migration_path.read_text(encoding="utf-8")


class AsyncCursor:
    """Async cursor wrapper around sqlite3.Cursor supporting both await and async with."""

    def __init__(self, cursor: sqlite3.Cursor) -> None:
        self._cursor = cursor

    def __await__(self):
        async def _resolve():
            return self
        return _resolve().__await__()

    async def fetchone(self) -> Any:
        return self._cursor.fetchone()

    async def fetchall(self) -> list[Any]:
        return self._cursor.fetchall()

    async def __aenter__(self) -> AsyncCursor:
        return self

    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        pass



class AsyncConnection:
    """Async connection wrapper around sqlite3.Connection."""

    def __init__(self, path: str) -> None:
        self.path = path
        # Ensure parent directory exists
        if path != ":memory:":
            Path(path).parent.mkdir(parents=True, exist_ok=True)
        self._conn: sqlite3.Connection = sqlite3.connect(
            path,
            check_same_thread=False,
            timeout=10.0,
        )
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA foreign_keys=ON;")

    def execute(self, sql: str, params: Any = ()) -> AsyncCursor:
        cur = self._conn.execute(sql, params)
        return AsyncCursor(cur)


    async def executescript(self, sql: str) -> None:
        self._conn.executescript(sql)

    async def commit(self) -> None:
        self._conn.commit()

    async def close(self) -> None:
        if self._conn:
            self._conn.close()

    async def __aenter__(self) -> AsyncConnection:
        return self

    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        await self.close()


async def init_db(db_path: str | None = None) -> None:
    """Initialise database tables from migration script."""
    global _db_path
    _db_path = db_path or _resolve_db_path()

    migration_sql = _load_migration_sql()

    async with AsyncConnection(_db_path) as db:
        await db.executescript(migration_sql)
        await db.commit()

    logger.info("Database initialised at %s", _db_path)


@asynccontextmanager
async def get_db() -> AsyncGenerator[AsyncConnection, None]:
    """Async context manager that yields a database connection."""
    path = _db_path or _resolve_db_path()
    conn = AsyncConnection(path)
    try:
        yield conn
    finally:
        await conn.close()
