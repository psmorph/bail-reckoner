from services.rbac import Permission, ROLE_PERMISSIONS


def test_a6_role_permission_matrix():
    expected = {
        "forensic_officer": {
            Permission.CASE_READ, Permission.CASE_SEARCH,
            Permission.DOC_UPLOAD, Permission.DOC_READ, Permission.DOC_DOWNLOAD,
            Permission.EVIDENCE_READ,
            Permission.FORENSIC_CREATE, Permission.FORENSIC_READ, Permission.FORENSIC_UPDATE,
            Permission.BLOCKCHAIN_READ, Permission.BLOCKCHAIN_VERIFY,
            Permission.NOTIFICATION_READ,
        },
        "court_officer": {
            Permission.CASE_READ, Permission.CASE_SEARCH,
            Permission.DOC_READ, Permission.DOC_DOWNLOAD, Permission.DOC_VERIFY,
            Permission.EVIDENCE_READ, Permission.INVESTIGATION_READ, Permission.FORENSIC_READ,
            Permission.COURT_CREATE, Permission.COURT_READ, Permission.COURT_UPDATE,
            Permission.BAIL_ANALYZE, Permission.BAIL_READ,
            Permission.BLOCKCHAIN_READ, Permission.BLOCKCHAIN_VERIFY,
            Permission.NOTIFICATION_READ,
        },
        "investigator": {
            Permission.CASE_READ, Permission.CASE_SEARCH,
            Permission.DOC_UPLOAD, Permission.DOC_READ, Permission.DOC_DOWNLOAD, Permission.DOC_VERIFY,
            Permission.EVIDENCE_CREATE, Permission.EVIDENCE_READ, Permission.EVIDENCE_UPDATE,
            Permission.EVIDENCE_TRANSFER,
            Permission.INVESTIGATION_CREATE, Permission.INVESTIGATION_READ, Permission.INVESTIGATION_UPDATE,
            Permission.FORENSIC_READ, Permission.COURT_READ,
            Permission.NOTIFICATION_READ, Permission.BLOCKCHAIN_READ, Permission.BLOCKCHAIN_VERIFY,
        },
    }
    for role_id, permissions in expected.items():
        assert set(ROLE_PERMISSIONS[role_id]) == {permission.value for permission in permissions}
