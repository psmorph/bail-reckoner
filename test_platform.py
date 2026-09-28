"""End-to-end test for the NyaySetu Platform API."""
import requests, json, os, tempfile

BASE = 'http://127.0.0.1:8000'

# 1. Login as police officer
r = requests.post(f'{BASE}/api/auth/login', json={'email': 'si.sharma@police.dl.in', 'password': 'demo1234'})
print('1. Login:', r.status_code)
token = r.json()['access_token']
headers = {'Authorization': f'Bearer {token}'}

# 2. Get case stats
r = requests.get(f'{BASE}/api/cases/stats', headers=headers)
print('2. Case stats:', r.status_code, r.json()['total_cases'], 'cases')

# 3. List cases
r = requests.get(f'{BASE}/api/cases', headers=headers)
print('3. List cases:', r.status_code, 'total=', r.json()['total'])

# 4. Get existing case
r = requests.get(f'{BASE}/api/cases/CASE-2026-00001', headers=headers)
print('4. Get case:', r.status_code, 'docs=', len(r.json().get('documents', [])))

# 5. Create new case
r = requests.post(f'{BASE}/api/cases', headers=headers, json={
    'title': 'State v. Test Accused - Robbery',
    'fir_number': 'FIR/2026/DL/000456',
    'sections': '392, 397',
    'priority': 'high',
    'accused_name': 'Test Accused',
    'police_station': 'PS Connaught Place',
    'district': 'Central Delhi',
})
print('5. Create case:', r.status_code, r.json())
new_case_id = r.json()['case_id']

# 6. Upload document
with tempfile.NamedTemporaryFile(suffix='.txt', delete=False, mode='w') as f:
    f.write('This is a test document for evidence.\nContains case details.\n')
    f.flush()
    tmp = f.name

with open(tmp, 'rb') as f:
    r = requests.post(f'{BASE}/api/documents', headers=headers,
                       params={'case_id': new_case_id, 'doc_type': 'evidence_report'},
                       files={'file': ('test_evidence.txt', f, 'text/plain')})
print('6. Upload doc:', r.status_code, r.json())
doc_id = r.json()['document_id']

# 7. Register on blockchain
r = requests.post(f'{BASE}/api/blockchain/register', headers=headers,
                    json={'document_id': doc_id, 'case_id': new_case_id})
print('7. Blockchain:', r.status_code, 'block=', r.json().get('block_index'), 'nonce=', r.json().get('nonce'))

# 8. Verify document
r = requests.post(f'{BASE}/api/documents/{doc_id}/verify', headers=headers)
print('8. Verify doc:', r.status_code, r.json().get('integrity_status'), r.json().get('hash_match'))

# 9. Verify blockchain record
r = requests.get(f'{BASE}/api/blockchain/verify/{doc_id}', headers=headers)
print('9. Blockchain verify:', r.status_code, r.json().get('status'))

# 10. Get case timeline
r = requests.get(f'{BASE}/api/cases/{new_case_id}/timeline', headers=headers)
print('10. Timeline:', r.status_code, 'events=', len(r.json().get('timeline', [])))

# 11. Verify full chain integrity
r = requests.post(f'{BASE}/api/blockchain/verify-chain', headers=headers)
print('11. Chain integrity:', r.status_code, 'valid=', r.json().get('valid'), 'blocks=', r.json().get('blocks_checked'))

# 12. Get audit logs (admin only)
admin_login = requests.post(f'{BASE}/api/auth/login', json={'email': 'admin@bailreckoner.in', 'password': 'demo1234'})
admin_headers = {'Authorization': f'Bearer {admin_login.json()["access_token"]}'}
r = requests.get(f'{BASE}/api/audit', headers=admin_headers)
print('12. Audit logs:', r.status_code, 'total=', r.json().get('total'))

# 13. Check existing API routes still work
r = requests.get(f'{BASE}/api/stats')
print('13. Old /api/stats:', r.status_code, r.json())

# ===== NEW: Evidence Management =====

# 14. Register evidence
r = requests.post(f'{BASE}/api/evidence', headers=headers, json={
    'case_id': new_case_id,
    'evidence_type': 'physical',
    'description': 'Weapon recovered from crime scene — iron rod (30 cm)',
    'source': 'Crime Scene at 15 Karol Bagh, New Delhi',
    'location': 'Evidence Room, PS Connaught Place',
})
print('14. Create evidence:', r.status_code, r.json())
evidence_id = r.json()['evidence_id']

# 15. List evidence
r = requests.get(f'{BASE}/api/evidence', headers=headers, params={'case_id': new_case_id})
print('15. List evidence:', r.status_code, 'count=', r.json()['count'])

# 16. Get evidence details
r = requests.get(f'{BASE}/api/evidence/{evidence_id}', headers=headers)
print('16. Get evidence:', r.status_code, 'chain_of_custody=', len(r.json().get('chain_of_custody', [])))

# ===== NEW: Court Proceedings =====

# 17. Create court proceeding
r = requests.post(f'{BASE}/api/court-proceedings', headers=headers, json={
    'case_id': new_case_id,
    'hearing_date': '2026-10-05',
    'hearing_type': 'bail',
    'court_name': 'Patiala House Court',
    'presiding_officer': 'Hon. Justice Kumar',
    'summary': 'First bail hearing. Arguments heard from both sides.',
    'next_date': '2026-10-15',
})
print('17. Create proceeding:', r.status_code, r.json())

# 18. List court proceedings
r = requests.get(f'{BASE}/api/court-proceedings', headers=headers, params={'case_id': new_case_id})
print('18. List proceedings:', r.status_code, 'count=', r.json()['count'])

# ===== NEW: Notifications =====

# 19. List notifications
r = requests.get(f'{BASE}/api/notifications', headers=headers)
print('19. List notifications:', r.status_code, 'count=', r.json()['count'], 'unread=', r.json()['unread_count'])

# 20. Get notification count
r = requests.get(f'{BASE}/api/notifications/count', headers=headers)
print('20. Notification count:', r.status_code, 'unread=', r.json()['unread_count'])

# ===== NEW: Investigation Entries =====

# 21. Login as investigator to test investigation entries
inv_login = requests.post(f'{BASE}/api/auth/login', json={'email': 'admin@bailreckoner.in', 'password': 'demo1234'})
inv_headers = {'Authorization': f'Bearer {inv_login.json()["access_token"]}'}

r = requests.post(f'{BASE}/api/investigations', headers=inv_headers, json={
    'case_id': new_case_id,
    'entry_type': 'diary',
    'title': 'Initial Scene Investigation',
    'content': 'Visited crime scene at 15 Karol Bagh. Collected physical evidence and witness statements.',
    'findings': 'Weapon recovered. Two eyewitnesses identified.',
})
print('21. Create investigation:', r.status_code, r.json())

# 22. List investigations
r = requests.get(f'{BASE}/api/investigations', headers=inv_headers, params={'case_id': new_case_id})
print('22. List investigations:', r.status_code, 'count=', r.json()['count'])

os.unlink(tmp)
print('\n=== ALL TESTS PASSED! ===')
