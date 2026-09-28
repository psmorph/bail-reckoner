/**
 * NyaySetu — API Client
 * Communicates with the FastAPI backend.
 * Extended with platform authentication support.
 */

import { getAuthToken } from './state.js';

const BASE = '';  // Same origin

/** Generic fetch helper — now attaches JWT auth header when available */
async function request(method, path, body = null, params = null) {
    let url = `${BASE}${path}`;
    if (params) {
        const qs = new URLSearchParams(
            Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
        );
        if (qs.toString()) url += `?${qs}`;
    }

    const opts = {
        method,
        headers: { 'Content-Type': 'application/json' },
    };

    // Attach auth token if available
    const token = getAuthToken();
    if (token) {
        opts.headers['Authorization'] = `Bearer ${token}`;
    }

    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(url, opts);
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || `API error ${res.status}`);
    }
    return res.json();
}

// ===== Platform Authentication =================================================

export async function platformLogin(email, password) {
    return request('POST', '/api/auth/login', { email, password });
}

export async function platformRegister(data) {
    return request('POST', '/api/auth/register', data);
}

export async function getProfile() {
    return request('GET', '/api/auth/me');
}

export async function platformLogout() {
    return request('POST', '/api/auth/logout');
}

export async function getAvailableRoles() {
    return request('GET', '/api/auth/roles');
}

// ===== Case Review (core workflow) ============================================

export async function reviewCase(data) {
    return request('POST', '/api/case/review', data);
}

// ===== Judgment Search ========================================================

export async function searchJudgments(query, filters = {}) {
    return request('GET', '/api/cases/search', null, { query, ...filters });
}

// ===== Custody Calculator =====================================================

export async function calculateCustody(arrestDate, calcDate = null) {
    return request('POST', '/api/custody/calculate', {
        arrest_date: arrestDate,
        calculation_date: calcDate,
    });
}

// ===== Legal Provisions =======================================================

export async function getProvisions(params = {}) {
    return request('GET', '/api/provisions', null, params);
}

export async function getProvisionCategories() {
    return request('GET', '/api/provisions/categories');
}

// ===== Custody Rules ==========================================================

export async function getCustodyRules() {
    return request('GET', '/api/custody-rules');
}

// ===== Procedural Checklist ===================================================

export async function getChecklist(category = '', bailType = '') {
    return request('GET', '/api/checklist', null, { category, bail_type: bailType });
}

// ===== Landmark Judgments =====================================================

export async function getLandmarkJudgments(params = {}) {
    return request('GET', '/api/judgments', null, params);
}

// ===== Database Stats =========================================================

export async function getStats() {
    return request('GET', '/api/stats');
}

// ===== Platform: Case Management ==============================================

export async function createCase(data) {
    return request('POST', '/api/cases', data);
}

export async function listCases(params = {}) {
    return request('GET', '/api/cases', null, params);
}

export async function getCaseStats() {
    return request('GET', '/api/cases/stats');
}

export async function getCase(caseId) {
    return request('GET', `/api/cases/${caseId}`);
}

export async function updateCase(caseId, data) {
    return request('PUT', `/api/cases/${caseId}`, data);
}

export async function getCaseTimeline(caseId) {
    return request('GET', `/api/cases/${caseId}/timeline`);
}

// ===== Platform: Documents ====================================================

export async function uploadDocument(caseId, docType, file) {
    const formData = new FormData();
    formData.append('file', file);

    const token = (await import('./state.js')).getAuthToken();
    const res = await fetch(`/api/documents?case_id=${encodeURIComponent(caseId)}&doc_type=${encodeURIComponent(docType)}`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || `Upload failed: ${res.status}`);
    }
    return res.json();
}

export async function listDocuments(params = {}) {
    return request('GET', '/api/documents', null, params);
}

export async function getDocument(docId) {
    return request('GET', `/api/documents/${docId}`);
}

export async function verifyDocument(docId) {
    return request('POST', `/api/documents/${docId}/verify`);
}

export async function downloadDocument(docId) {
    const token = (await import('./state.js')).getAuthToken();
    const res = await fetch(`/api/documents/${docId}/download`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Download failed');
    const blob = await res.blob();
    const hash = res.headers.get('X-Document-Hash') || '';
    return { blob, hash, filename: res.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'document' };
}

// ===== Platform: Blockchain ===================================================

export async function registerOnBlockchain(documentId, caseId = '') {
    return request('POST', '/api/blockchain/register', { document_id: documentId, case_id: caseId });
}

export async function verifyOnBlockchain(documentId) {
    return request('GET', `/api/blockchain/verify/${documentId}`);
}

export async function getBlockchain(limit = 50) {
    return request('GET', '/api/blockchain/chain', null, { limit });
}

export async function verifyFullChain() {
    return request('POST', '/api/blockchain/verify-chain');
}

// ===== Platform: Audit ========================================================

export async function getAuditLogs(params = {}) {
    return request('GET', '/api/audit', null, params);
}

export async function getSecurityEvents() {
    return request('GET', '/api/audit/security');
}

// ===== Platform: Investigations ===============================================

export async function createInvestigation(data) {
    return request('POST', '/api/investigations', data);
}

export async function listInvestigations(params = {}) {
    return request('GET', '/api/investigations', null, params);
}

export async function getInvestigation(id) {
    return request('GET', `/api/investigations/${id}`);
}

export async function updateInvestigation(id, data) {
    return request('PUT', `/api/investigations/${id}`, data);
}

// ===== Platform: Evidence =====================================================

export async function createEvidence(data) {
    return request('POST', '/api/evidence', data);
}

export async function listEvidence(params = {}) {
    return request('GET', '/api/evidence', null, params);
}

export async function getEvidence(evidenceId) {
    return request('GET', `/api/evidence/${evidenceId}`);
}

export async function updateEvidence(evidenceId, data) {
    return request('PUT', `/api/evidence/${evidenceId}`, data);
}

export async function transferEvidence(evidenceId, toUserId, reason = '') {
    return request('POST', `/api/evidence/${evidenceId}/transfer`, { to_user_id: toUserId, reason });
}

// ===== Platform: Forensic Reports =============================================

export async function createForensicReport(data) {
    return request('POST', '/api/forensics', data);
}

export async function listForensicReports(params = {}) {
    return request('GET', '/api/forensics', null, params);
}

export async function getForensicReport(reportId) {
    return request('GET', `/api/forensics/${reportId}`);
}

export async function updateForensicReport(reportId, data) {
    return request('PUT', `/api/forensics/${reportId}`, data);
}

// ===== Platform: Court Proceedings ============================================

export async function createCourtProceeding(data) {
    return request('POST', '/api/court-proceedings', data);
}

export async function listCourtProceedings(params = {}) {
    return request('GET', '/api/court-proceedings', null, params);
}

export async function getCourtProceeding(proceedingId) {
    return request('GET', `/api/court-proceedings/${proceedingId}`);
}

export async function updateCourtProceeding(proceedingId, data) {
    return request('PUT', `/api/court-proceedings/${proceedingId}`, data);
}

// ===== Platform: Notifications ================================================

export async function listNotifications(params = {}) {
    return request('GET', '/api/notifications', null, params);
}

export async function markNotificationRead(notificationId) {
    return request('POST', `/api/notifications/${notificationId}/read`);
}

export async function markAllNotificationsRead() {
    return request('POST', '/api/notifications/mark-all-read');
}

export async function getNotificationCount() {
    return request('GET', '/api/notifications/count');
}

