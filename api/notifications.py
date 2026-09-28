"""
NyaySetu Platform — Notifications API Router
Manage user notifications with read/unread status.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from api.database import get_db, generate_id, now_iso
from api.middleware import CurrentUser, get_current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


class NotificationCreate(BaseModel):
    title: str
    body: str = ""
    type: str = "info"  # info, warning, urgent, success
    link: str = ""


@router.get("")
async def list_notifications(
    unread_only: bool = False,
    limit: int = 50,
    offset: int = 0,
    current_user: CurrentUser = Depends(get_current_user),
):
    """List notifications for the current user."""
    q = "SELECT * FROM notifications WHERE user_id = ?"
    params = [current_user.id]

    if unread_only:
        q += " AND is_read = 0"

    q += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    with get_db() as conn:
        rows = conn.execute(q, params).fetchall()
        unread = conn.execute(
            "SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0",
            (current_user.id,),
        ).fetchone()

    return {
        "notifications": [dict(r) for r in rows],
        "count": len(rows),
        "unread_count": unread["cnt"] if unread else 0,
    }


@router.post("/{notification_id}/read")
async def mark_as_read(
    notification_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Mark a notification as read."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM notifications WHERE id = ? AND user_id = ?",
            (notification_id, current_user.id),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Notification not found")

        conn.execute("UPDATE notifications SET is_read = 1 WHERE id = ?", (notification_id,))

    return {"message": "Notification marked as read"}


@router.post("/mark-all-read")
async def mark_all_as_read(
    current_user: CurrentUser = Depends(get_current_user),
):
    """Mark all notifications as read for the current user."""
    with get_db() as conn:
        conn.execute(
            "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0",
            (current_user.id,),
        )

    return {"message": "All notifications marked as read"}


@router.get("/count")
async def get_notification_count(
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get unread notification count (lightweight endpoint for polling)."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0",
            (current_user.id,),
        ).fetchone()

    return {"unread_count": row["cnt"] if row else 0}


# ── Helper: Create notification from other modules ─────────────────────────

def create_notification(user_id: str, title: str, body: str = "",
                        notification_type: str = "info", link: str = ""):
    """Create a notification for a user (called from other API modules)."""
    notification_id = generate_id("NTF-")
    now = now_iso()
    with get_db() as conn:
        conn.execute(
            """INSERT INTO notifications (id, user_id, type, title, body, link, is_read, created_at)
               VALUES (?, ?, ?, ?, ?, ?, 0, ?)""",
            (notification_id, user_id, notification_type, title, body, link, now),
        )
    return notification_id
