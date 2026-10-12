from __future__ import annotations

from fastapi import HTTPException


def _org_matches(case_org, user_org) -> bool:
    return bool(case_org) and bool(user_org) and str(case_org) == str(user_org)


def accessible_case_clause(user):
    """Return SQL fragment and params for case visibility for the user."""
    if user.role_id in ("master_admin", "auditor"):
        return "1=1", []
    if user.role_id in ("court_admin", "court_officer"):
        return "1=1", []
    return (
        "(c.organization_id = ? OR c.created_by = ? OR c.assigned_investigator = ? OR c.assigned_forensic = ?)",
        [user.organization_id, user.id, user.id, user.id],
    )


def check_case_access(conn, case_id: str, user) -> dict:
    """Ensure the current user can access the target case."""
    case = conn.execute("SELECT * FROM cases WHERE id = ?", (case_id,)).fetchone()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    case_dict = dict(case)
    if user.role_id in ("master_admin", "auditor"):
        return case_dict
    if user.role_id in ("court_admin", "court_officer"):
        return case_dict

    org_match = _org_matches(case_dict.get("organization_id"), user.organization_id)
    creator_match = case_dict.get("created_by") == user.id
    investigator_match = case_dict.get("assigned_investigator") == user.id
    forensic_match = case_dict.get("assigned_forensic") == user.id

    if not (org_match or creator_match or investigator_match or forensic_match):
        raise HTTPException(status_code=403, detail="Access denied to this case")
    return case_dict
