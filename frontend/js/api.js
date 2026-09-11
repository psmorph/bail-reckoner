/**
 * Bail Reckoner — API Client
 * Communicates with the FastAPI backend.
 */

const BASE = '';  // Same origin

/** Generic fetch helper */
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
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(url, opts);
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || `API error ${res.status}`);
    }
    return res.json();
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
