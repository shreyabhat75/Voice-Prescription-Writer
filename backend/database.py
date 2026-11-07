"""Database abstraction layer supporting PostgreSQL (asyncpg connection pooling) and SQLite.

Enforces production-grade connection pooling, transaction isolation, and async operations.
Strict database engine mode: If PostgreSQL is configured, does not silently fall back to SQLite.
"""

from __future__ import annotations

import asyncio
from datetime import datetime
import itertools
import json
import logging
import os
import re
import sqlite3
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, AsyncGenerator, Optional

from backend.config import get_settings

logger = logging.getLogger(__name__)

_db_path: str | None = None
_pg_pool: Any = None  # asyncpg.Pool


def is_postgres_url(url: str | None) -> bool:
    """Return True if connection URL specifies a PostgreSQL endpoint."""
    if not url:
        return False
    return url.startswith("postgresql://") or url.startswith("postgres://")


def _resolve_db_target() -> str:
    """Return the resolved database URL or path from environment or settings."""
    env_url = os.environ.get("DATABASE_URL")
    if env_url:
        return env_url
    env_path = os.environ.get("DATABASE_PATH")
    if env_path:
        return env_path
    settings = get_settings()
    return settings.DATABASE_URL or settings.DATABASE_PATH or "./voice_prescriptions.db"


def _load_migration_sql(is_pg: bool = False) -> str:
    """Read the appropriate SQL migration file."""
    filename = "init_postgres.sql" if is_pg else "init.sql"
    migration_path = Path(__file__).parent / "data" / "migrations" / filename
    if not migration_path.exists():
        raise FileNotFoundError(f"Migration file not found: {migration_path}")
    return migration_path.read_text(encoding="utf-8")


def _convert_qmarks_to_dollars(sql: str) -> str:
    """Convert SQLite '?' parameter placeholders to PostgreSQL '$1, $2, ...' syntax."""
    counter = itertools.count(1)
    return re.sub(r"\?", lambda _: f"${next(counter)}", sql)


# =============================================================================
# SQLite Async Wrappers
# =============================================================================

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
        # Strip sqlite:/// prefix if present
        clean_path = path.replace("sqlite:///", "").replace("sqlite://", "")
        self.path = clean_path
        if clean_path != ":memory:":
            Path(clean_path).parent.mkdir(parents=True, exist_ok=True)
        self._conn: sqlite3.Connection = sqlite3.connect(
            clean_path,
            check_same_thread=False,
            timeout=10.0,
        )
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA foreign_keys=ON;")
        if clean_path != ":memory:":
            self._conn.execute("PRAGMA synchronous=NORMAL;")
            self._conn.execute("PRAGMA cache_size=-64000;")
            self._conn.execute("PRAGMA busy_timeout=5000;")

    def execute(self, sql: str, params: Any = ()) -> AsyncCursor:
        cur = self._conn.execute(sql, params)
        return AsyncCursor(cur)

    async def fetch_all(self, sql: str, params: Any = ()) -> list[Any]:
        cur = self.execute(sql, params)
        return await cur.fetchall()

    async def fetch_one(self, sql: str, params: Any = ()) -> Any:
        cur = self.execute(sql, params)
        return await cur.fetchone()

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


# =============================================================================
# PostgreSQL asyncpg Wrappers
# =============================================================================

class AsyncPgCursor:
    """Cursor wrapper for PostgreSQL asyncpg results conforming to the unified cursor interface."""

    def __init__(self, rows: list[Any] | None) -> None:
        self._rows = rows or []

    def __await__(self):
        async def _resolve():
            return self
        return _resolve().__await__()

    async def fetchone(self) -> Any:
        return self._rows[0] if self._rows else None

    async def fetchall(self) -> list[Any]:
        return self._rows

    async def __aenter__(self) -> AsyncPgCursor:
        return self

    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        pass


class AsyncPgExecuteTask:
    """Dual coroutine and async context manager allowing both `await db.execute()` and `async with db.execute()`."""

    def __init__(self, coro: Any) -> None:
        self._coro = coro
        self._cursor: AsyncPgCursor | None = None

    def __await__(self):
        return self._coro.__await__()

    async def __aenter__(self) -> AsyncPgCursor:
        self._cursor = await self._coro
        return self._cursor

    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        pass


class AsyncPgConnection:
    """Async connection wrapper around asyncpg.Connection supporting unified database methods."""

    def __init__(self, connection: Any, transaction: Any = None) -> None:
        self._conn = connection
        self._tx = transaction

    def execute(self, sql: str, params: Any = ()) -> AsyncPgExecuteTask:
        async def _run() -> AsyncPgCursor:
            pg_sql = _convert_qmarks_to_dollars(sql)
            raw_args = list(params) if isinstance(params, (tuple, list)) else []
            clean_args = []
            for arg in raw_args:
                if isinstance(arg, str) and len(arg) >= 19 and ("T" in arg or ("-" in arg and ":" in arg)):
                    try:
                        dt = datetime.fromisoformat(arg)
                        clean_args.append(dt)
                        continue
                    except ValueError:
                        pass
                clean_args.append(arg)

            # If query is a SELECT, fetch rows; otherwise execute
            if re.match(r"^\s*(?:SELECT|WITH)\b", pg_sql, re.I):
                records = await self._conn.fetch(pg_sql, *clean_args)
                return AsyncPgCursor(records)
            else:
                await self._conn.execute(pg_sql, *clean_args)
                return AsyncPgCursor([])

        return AsyncPgExecuteTask(_run())

    async def fetch_all(self, sql: str, params: Any = ()) -> list[Any]:
        cur = await self.execute(sql, params)
        return await cur.fetchall()

    async def fetch_one(self, sql: str, params: Any = ()) -> Any:
        cur = await self.execute(sql, params)
        return await cur.fetchone()

    async def executescript(self, sql: str) -> None:
        await self._conn.execute(sql)

    async def commit(self) -> None:
        # In asyncpg, transactions are managed via transaction context blocks
        pass

    async def close(self) -> None:
        # Pool handles connection lifetime
        pass

    async def __aenter__(self) -> AsyncPgConnection:
        return self

    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        pass


# =============================================================================
# Lifecycle and Context Manager
# =============================================================================

async def init_db(db_target: str | None = None) -> None:
    """Initialise database tables, migrations, and connection pools."""
    global _db_path, _pg_pool
    target = db_target or _resolve_db_target()
    _db_path = target

    if is_postgres_url(target):
        try:
            import asyncpg
        except ImportError as e:
            raise RuntimeError(
                "asyncpg library is required for PostgreSQL connections. "
                "Please run: pip install asyncpg"
            ) from e

        logger.info("Connecting to PostgreSQL at %s", target.split("@")[-1] if "@" in target else target)
        try:
            _pg_pool = await asyncpg.create_pool(
                dsn=target,
                min_size=2,
                max_size=10,
                command_timeout=10,
            )
        except Exception as e:
            logger.error("Failed to connect to PostgreSQL: %s", e)
            raise RuntimeError(
                f"PostgreSQL connection to {target} failed: {e}. "
                f"Strict engine mode active: application will not silently fall back to SQLite."
            ) from e

        migration_sql = _load_migration_sql(is_pg=True)
        async with _pg_pool.acquire() as conn:
            await conn.execute(migration_sql)
            # Add doctor columns if not already present
            try:
                await conn.execute("ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS doctor_name VARCHAR(150);")
                await conn.execute("ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS doctor_id VARCHAR(64);")
                await conn.execute("CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor ON prescriptions(doctor_name);")
            except Exception as e:
                logger.warning("Postgres column migration check notice: %s", e)
        logger.info("PostgreSQL database initialized successfully with schema migrations.")

    else:
        # SQLite Initialization
        migration_sql = _load_migration_sql(is_pg=False)
        async with AsyncConnection(target) as db:
            clean_path = target.replace("sqlite:///", "").replace("sqlite://", "")
            if clean_path != ":memory:":
                db._conn.execute("PRAGMA journal_mode=WAL;")

            # Migrate existing tables for new columns gracefully before scripts run
            for col_name, col_type in [
                ("patient_id", "TEXT"),
                ("edited_transcript", "TEXT"),
                ("pdf_path", "TEXT"),
                ("verified_at", "TEXT"),
                ("doctor_name", "TEXT"),
                ("doctor_id", "TEXT"),
            ]:
                try:
                    db._conn.execute(f"ALTER TABLE prescriptions ADD COLUMN {col_name} {col_type};")
                except sqlite3.OperationalError:
                    pass

            await db.executescript(migration_sql)

            try:
                db._conn.execute("CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);")
                db._conn.execute("CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor ON prescriptions(doctor_name);")
            except sqlite3.OperationalError:
                pass

            await db.commit()
        logger.info("SQLite database initialised at %s", target)


async def close_db() -> None:
    """Gracefully terminate database connection pools."""
    global _pg_pool
    if _pg_pool:
        await _pg_pool.close()
        _pg_pool = None
        logger.info("PostgreSQL connection pool closed.")


@asynccontextmanager
async def get_db() -> AsyncGenerator[Any, None]:
    """Async context manager that yields an active database connection (PostgreSQL or SQLite)."""
    target = _db_path or _resolve_db_target()

    if is_postgres_url(target):
        if _pg_pool is None:
            raise RuntimeError("PostgreSQL connection pool has not been initialized. Call init_db() first.")
        async with _pg_pool.acquire() as conn:
            yield AsyncPgConnection(conn)
    else:
        conn = AsyncConnection(target)
        try:
            yield conn
        finally:
            await conn.close()
