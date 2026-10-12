from __future__ import annotations

from api.database import generate_id, get_db, now_iso


def create_notification(user_id: str, title: str, body: str = "", notification_type: str = "info", link: str = ""):
    """Create a notification for a user."""
    notification_id = generate_id("NTF-")
    with get_db() as conn:
        conn.execute(
            """INSERT INTO notifications (id, user_id, type, title, body, link, is_read, created_at)
               VALUES (?, ?, ?, ?, ?, ?, 0, ?)""",
            (notification_id, user_id, notification_type, title, body, link, now_iso()),
        )
    return notification_id
