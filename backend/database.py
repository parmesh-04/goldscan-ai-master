"""
Database Layer — SQLite persistence for GoldScan AI

Uses aiosqlite for async SQLite access (no external DB server needed).
Schema:
  - submissions: one row per completed assessment
  - Stores the full JSON result blob alongside applicant metadata

Why SQLite and not PostgreSQL?
  For a placement/demo deployment, SQLite is ideal:
    - Zero infrastructure (single file on disk)
    - Works identically in Docker and locally
    - Easily swapped for Postgres by changing the driver

Tables created automatically on first startup via init_db().
"""

import aiosqlite
import json
import logging
import os
import uuid
from datetime import datetime

# Path to the SQLite database file — configurable via DATABASE_URL env var
DATABASE_PATH = os.environ.get("DATABASE_URL", "./goldscan.db")

logger = logging.getLogger(__name__)


async def init_db() -> None:
    """
    Creates the database schema if it doesn't exist.
    Called once at FastAPI startup via the lifespan handler.
    """
    async with aiosqlite.connect(DATABASE_PATH) as db:
        # Main submissions table: stores every completed assessment
        await db.execute("""
            CREATE TABLE IF NOT EXISTS submissions (
                id          TEXT PRIMARY KEY,              -- UUID, generated server-side
                app_id      TEXT NOT NULL,                 -- Human-readable ID like GS-1234
                applicant   TEXT,                          -- Customer name + location
                created_at  TEXT NOT NULL,                 -- ISO 8601 timestamp
                result_json TEXT NOT NULL,                 -- Full JSON blob of analysis result
                reviewed    INTEGER DEFAULT 0              -- 0=pending, 1=reviewed by officer
            )
        """)
        await db.commit()
    logger.info("Database initialised at: %s", DATABASE_PATH)


async def save_submission(result: dict) -> tuple[str, str]:
    """
    Persists a completed assessment to the database.
    Generates a server-side UUID and a short human-readable app ID.
    Returns the assigned submission ID.
    """
    submission_id = str(uuid.uuid4())
    # Short ID for display: GS- followed by 4 uppercase hex chars
    app_id = f"GS-{submission_id[:4].upper()}"
    created_at = datetime.utcnow().isoformat()

    applicant = result.get("declarations", {}).get("applicantName", "Unknown")
    location = result.get("declarations", {}).get("location", "")
    applicant_display = f"{applicant}, {location}".strip(", ") if location else applicant

    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute(
            """INSERT INTO submissions (id, app_id, applicant, created_at, result_json)
               VALUES (?, ?, ?, ?, ?)""",
            (submission_id, app_id, applicant_display, created_at, json.dumps(result))
        )
        await db.commit()

    logger.info("Submission saved: id=%s app_id=%s", submission_id, app_id)
    return submission_id, app_id


async def get_submissions(limit: int = 50) -> list[dict]:
    """
    Returns the most recent submissions for the NBFC dashboard.
    Results are ordered newest-first.
    """
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT id, app_id, applicant, created_at, result_json, reviewed "
            "FROM submissions ORDER BY created_at DESC LIMIT ?",
            (limit,)
        )
        rows = await cursor.fetchall()

    submissions = []
    for row in rows:
        try:
            result_data = json.loads(row["result_json"])
        except (json.JSONDecodeError, KeyError):
            result_data = {}
        submissions.append({
            "id": row["id"],
            "appId": row["app_id"],
            "applicant": row["applicant"],
            "createdAt": row["created_at"],
            "reviewed": bool(row["reviewed"]),
            **result_data,   # Spread the full result for the dashboard
        })

    return submissions


async def delete_submission(submission_id: str) -> bool:
    """
    Deletes a submission by ID. Returns True if a row was deleted, False otherwise.
    Used by the NBFC dashboard when an officer clears a completed application.
    """
    async with aiosqlite.connect(DATABASE_PATH) as db:
        cursor = await db.execute(
            "DELETE FROM submissions WHERE id = ?", (submission_id,)
        )
        await db.commit()
        deleted = cursor.rowcount > 0

    if deleted:
        logger.info("Submission deleted: id=%s", submission_id)
    else:
        logger.warning("Delete requested for unknown submission id=%s", submission_id)

    return deleted


async def mark_reviewed(submission_id: str) -> bool:
    """
    Marks a submission as reviewed by a loan officer.
    Used to track which applications have been actioned.
    """
    async with aiosqlite.connect(DATABASE_PATH) as db:
        cursor = await db.execute(
            "UPDATE submissions SET reviewed = 1 WHERE id = ?", (submission_id,)
        )
        await db.commit()
        updated = cursor.rowcount > 0
    return updated
