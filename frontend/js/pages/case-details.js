/**
 * Bail Reckoner Platform — Case Details Page
 * Central case workspace with tabbed sections for documents, evidence,
 * investigation, forensic, court, blockchain, and audit trail.
 */
import { navbar, icons, badge, statCard, showToast, disclaimer, aiBadge, dataTable } from '../components.js';
import { getRole, getAuthUser, isAuthenticated, hasPermission } from '../state.js';
import * as api from '../api.js';

let caseData = null;
let activeTab = 'overview';

const TABS = [
    { id: 'overview', label: 'Overview', icon: '📋' },
    { id: 'documents', label: 'Documents', icon: '📄' },
    { id: 'evidence', label: 'Evidence', icon: '🔍' },
    { id: 'timeline', label: 'Timeline', icon: '🕐' },
    { id: 'blockchain', label: 'Blockchain', icon: '🔗' },
    { id: 'audit', label: 'Audit Trail', icon: '📊' },
];

function getCaseId() {
    const hash = window.location.hash;
    const match = hash.match(/case-details\/(.+)/);
    return match ? match[1] : '';
}

export function render() {
    const user = getAuthUser();
    const roleName = user?.role_name || localStorage.getItem('br_role_name') || 'User';

    return `
    <div class="layout-app">
        ${navbar({ showLinks: false, showRole: true, roleName })}
        <div class="page-content animate-fade-in">
            <div class="page-header">
                <div>
                    <div class="page-breadcrumb">
                        <span class="breadcrumb-link" data-navigate="/purpose">Home</span>
                        <span class="breadcrumb-sep">›</span>
                        <span class="breadcrumb-link" data-navigate="/case-search">Cases</span>
                        <span class="breadcrumb-sep">›</span>
                        <span id="case-breadcrumb">Loading...</span>
                    </div>
                    <h1 class="page-title" id="case-title">Loading Case...</h1>
                    <p class="page-subtitle" id="case-subtitle"></p>
                </div>
                <div class="page-actions" id="case-actions"></div>
            </div>

            <!-- Case Stats Bar -->
            <div class="grid-cols-5" id="case-stats-bar" style="margin-bottom: var(--space-4)">
                ${statCard({ icon: '📋', value: '—', label: 'Status', iconBg: 'var(--primary-50)' })}
                ${statCard({ icon: '📄', value: '—', label: 'Documents', iconBg: 'var(--info-50)' })}
                ${statCard({ icon: '🔍', value: '—', label: 'Evidence', iconBg: 'var(--warning-50)' })}
                ${statCard({ icon: '🔗', value: '—', label: 'Blockchain', iconBg: 'var(--success-50)' })}
                ${statCard({ icon: '📊', value: '—', label: 'Audit Events', iconBg: 'var(--danger-50)' })}
            </div>

            <!-- Tab Navigation -->
            <div class="tab-bar" id="case-tabs">
                ${TABS.map(t => `
                    <button class="tab-btn ${t.id === activeTab ? 'active' : ''}" data-tab="${t.id}">
                        <span class="tab-icon">${t.icon}</span> ${t.label}
                    </button>
                `).join('')}
            </div>

            <!-- Tab Content -->
            <div id="tab-content" class="card" style="margin-top: var(--space-4); min-height: 400px">
                <div style="text-align: center; padding: var(--space-10)">
                    <div class="spinner spinner-lg" style="margin: 0 auto var(--space-4)"></div>
                    <p style="color: var(--text-secondary)">Loading case data...</p>
                </div>
            </div>
        </div>
    </div>`;
}

export async function init() {
    const caseId = getCaseId();
    if (!caseId) {
        showToast('No case ID specified', 'warning');
        return;
    }

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            activeTab = btn.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderTabContent();
        });
    });

    // Load case
    try {
        caseData = await api.getCase(caseId);
        renderCaseHeader();
        renderTabContent();
    } catch (err) {
        document.getElementById('tab-content').innerHTML = `
            <div style="text-align: center; padding: var(--space-10)">
                <div style="font-size: 48px; margin-bottom: var(--space-4)">⚠️</div>
                <h3>Unable to load case</h3>
                <p style="color: var(--text-secondary); margin-top: var(--space-2)">${err.message}</p>
                <button class="btn btn-primary" style="margin-top: var(--space-4)" data-navigate="/case-search">Back to Cases</button>
            </div>`;
    }
}

function renderCaseHeader() {
    const c = caseData.case;
    document.getElementById('case-breadcrumb').textContent = c.id;
    document.getElementById('case-title').innerHTML = `${c.title} <span style="font-size: var(--text-sm); color: var(--text-tertiary); font-weight: normal">${c.id}</span>`;
    document.getElementById('case-subtitle').innerHTML = `
        ${badge(c.status, c.status === 'active' ? 'success' : 'danger')}
        ${badge(c.priority, c.priority === 'high' ? 'warning' : 'primary')}
        ${c.fir_number ? badge('FIR: ' + c.fir_number, 'info') : ''}
        <span style="color: var(--text-tertiary); margin-left: var(--space-2)">${caseData.organization_name || ''}</span>
    `;

    document.getElementById('case-actions').innerHTML = `
        <button class="btn btn-outline btn-sm" id="btn-upload-doc">${icons.upload} Upload Document</button>
        <button class="btn btn-primary btn-sm" data-navigate="/bail-reckoner">${icons.scales} Bail Assessment</button>
    `;

    // Stats bar
    document.getElementById('case-stats-bar').innerHTML = `
        ${statCard({ icon: '📋', value: c.status.charAt(0).toUpperCase() + c.status.slice(1), label: 'Status', iconBg: 'var(--primary-50)' })}
        ${statCard({ icon: '📄', value: (caseData.documents?.length || 0).toString(), label: 'Documents', iconBg: 'var(--info-50)' })}
        ${statCard({ icon: '🔍', value: (caseData.evidence?.length || 0).toString(), label: 'Evidence', iconBg: 'var(--warning-50)' })}
        ${statCard({ icon: '🔗', value: (caseData.blockchain_records?.length || 0).toString(), label: 'Blockchain', iconBg: 'var(--success-50)' })}
        ${statCard({ icon: '📊', value: (caseData.audit_logs?.length || 0).toString(), label: 'Audit Events', iconBg: 'var(--danger-50)' })}
    `;

    // Upload button handler
    document.getElementById('btn-upload-doc')?.addEventListener('click', showUploadModal);
}

function renderTabContent() {
    const container = document.getElementById('tab-content');
    switch (activeTab) {
        case 'overview': container.innerHTML = renderOverview(); break;
        case 'documents': container.innerHTML = renderDocuments(); initDocumentHandlers(); break;
        case 'evidence': container.innerHTML = renderEvidence(); break;
        case 'timeline': container.innerHTML = renderTimeline(); loadTimeline(); break;
        case 'blockchain': container.innerHTML = renderBlockchain(); initBlockchainHandlers(); break;
        case 'audit': container.innerHTML = renderAudit(); break;
        default: container.innerHTML = '<p>Tab not found</p>';
    }
}

// ── Overview Tab ────────────────────────────────────────────────────────

function renderOverview() {
    const c = caseData.case;
    return `
    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: var(--space-6)">
        <div>
            <h3 style="margin-bottom: var(--space-4)">Case Information</h3>
            <div class="detail-grid">
                <div class="detail-row"><span class="detail-label">Case ID</span><span class="detail-value">${c.id}</span></div>
                <div class="detail-row"><span class="detail-label">FIR Number</span><span class="detail-value">${c.fir_number || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">Case Type</span><span class="detail-value">${c.case_type || 'Criminal'}</span></div>
                <div class="detail-row"><span class="detail-label">Sections</span><span class="detail-value">${c.sections || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">Special Laws</span><span class="detail-value">${c.special_laws || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">Accused</span><span class="detail-value">${c.accused_name || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">Complainant</span><span class="detail-value">${c.complainant_name || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">Police Station</span><span class="detail-value">${c.police_station || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">District / State</span><span class="detail-value">${c.district || '—'}, ${c.state || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">Created By</span><span class="detail-value">${caseData.creator_name || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">Created</span><span class="detail-value">${formatDate(c.created_at)}</span></div>
            </div>
            ${c.description ? `
                <h4 style="margin-top: var(--space-6); margin-bottom: var(--space-3)">Description</h4>
                <div class="card" style="background: var(--neutral-50); padding: var(--space-4)">
                    <p style="white-space: pre-wrap; line-height: 1.7">${c.description}</p>
                </div>
            ` : ''}
        </div>
        <div>
            <h3 style="margin-bottom: var(--space-4)">Quick Summary</h3>
            <div style="display: flex; flex-direction: column; gap: var(--space-3)">
                <div class="mini-stat"><span class="mini-stat-label">📄 Documents</span><span class="mini-stat-value">${caseData.documents?.length || 0}</span></div>
                <div class="mini-stat"><span class="mini-stat-label">🔍 Evidence Items</span><span class="mini-stat-value">${caseData.evidence?.length || 0}</span></div>
                <div class="mini-stat"><span class="mini-stat-label">🔬 Forensic Reports</span><span class="mini-stat-value">${caseData.forensic_reports?.length || 0}</span></div>
                <div class="mini-stat"><span class="mini-stat-label">🏛️ Court Proceedings</span><span class="mini-stat-value">${caseData.court_proceedings?.length || 0}</span></div>
                <div class="mini-stat"><span class="mini-stat-label">⚖️ Bail Analyses</span><span class="mini-stat-value">${caseData.bail_analyses?.length || 0}</span></div>
                <div class="mini-stat"><span class="mini-stat-label">🔗 Blockchain Records</span><span class="mini-stat-value">${caseData.blockchain_records?.length || 0}</span></div>
            </div>
            ${caseData.documents?.length > 0 ? `
                <h4 style="margin-top: var(--space-6); margin-bottom: var(--space-3)">Recent Documents</h4>
                ${caseData.documents.slice(0, 3).map(d => `
                    <div class="mini-card" style="margin-bottom: var(--space-2)">
                        <span class="mini-card-icon">📄</span>
                        <div>
                            <div style="font-weight: var(--weight-medium); font-size: var(--text-sm)">${d.original_name}</div>
                            <div style="font-size: var(--text-xs); color: var(--text-tertiary)">${d.doc_type} · ${formatBytes(d.file_size)} · ${badge(d.verification_status, d.verification_status === 'verified' ? 'success' : d.verification_status === 'blockchain_registered' ? 'primary' : 'warning')}</div>
                        </div>
                    </div>
                `).join('')}
            ` : ''}
        </div>
    </div>`;
}

// ── Documents Tab ───────────────────────────────────────────────────────

function renderDocuments() {
    const docs = caseData.documents || [];
    return `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4)">
        <h3>Documents (${docs.length})</h3>
        <button class="btn btn-primary btn-sm" id="btn-upload-tab">${icons.upload} Upload Document</button>
    </div>
    ${docs.length === 0 ? `
        <div style="text-align: center; padding: var(--space-10); color: var(--text-secondary)">
            <div style="font-size: 48px; margin-bottom: var(--space-3)">📂</div>
            <p>No documents uploaded yet.</p>
            <button class="btn btn-outline" style="margin-top: var(--space-4)" id="btn-upload-empty">${icons.upload} Upload First Document</button>
        </div>
    ` : `
        <div class="doc-grid">
            ${docs.map(d => `
                <div class="doc-card" data-doc-id="${d.id}">
                    <div class="doc-card-header">
                        <div class="doc-icon">${getDocIcon(d.mime_type)}</div>
                        <div class="doc-actions">
                            <button class="btn btn-ghost btn-xs btn-verify" data-doc-id="${d.id}" title="Verify Integrity">${icons.lock}</button>
                            <button class="btn btn-ghost btn-xs btn-blockchain" data-doc-id="${d.id}" title="Register on Blockchain">🔗</button>
                            <button class="btn btn-ghost btn-xs btn-download" data-doc-id="${d.id}" title="Download">⬇️</button>
                        </div>
                    </div>
                    <div class="doc-name">${d.original_name}</div>
                    <div class="doc-meta">${d.doc_type} · ${formatBytes(d.file_size)}</div>
                    <div class="doc-meta">Uploaded by ${d.uploader_name || 'Unknown'}</div>
                    <div class="doc-meta">${formatDate(d.created_at)}</div>
                    <div class="doc-footer">
                        ${badge(d.verification_status, d.verification_status === 'verified' ? 'success' : d.verification_status === 'blockchain_registered' ? 'primary' : 'warning')}
                        ${d.encrypted ? badge('Encrypted', 'info') : ''}
                    </div>
                    <div class="doc-hash" title="${d.sha256_hash}">SHA-256: ${d.sha256_hash?.substring(0, 16)}...</div>
                </div>
            `).join('')}
        </div>
    `}`;
}

function initDocumentHandlers() {
    document.getElementById('btn-upload-tab')?.addEventListener('click', showUploadModal);
    document.getElementById('btn-upload-empty')?.addEventListener('click', showUploadModal);

    document.querySelectorAll('.btn-verify').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const docId = btn.dataset.docId;
            try {
                btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px"></div>';
                const result = await api.verifyDocument(docId);
                showToast(
                    result.integrity_status === 'verified'
                        ? `✅ Integrity verified! Hash matches.`
                        : `⚠️ INTEGRITY VIOLATION! Document may have been tampered with.`,
                    result.integrity_status === 'verified' ? 'success' : 'danger'
                );
                // Reload case
                caseData = await api.getCase(getCaseId());
                renderTabContent();
            } catch (err) {
                showToast('Verification failed: ' + err.message, 'danger');
                btn.innerHTML = icons.lock;
            }
        });
    });

    document.querySelectorAll('.btn-blockchain').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const docId = btn.dataset.docId;
            try {
                btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px"></div>';
                const result = await api.registerOnBlockchain(docId, getCaseId());
                showToast(`🔗 Registered on blockchain! Block #${result.block_index}`, 'success');
                caseData = await api.getCase(getCaseId());
                renderTabContent();
            } catch (err) {
                showToast('Blockchain registration failed: ' + err.message, 'danger');
                btn.innerHTML = '🔗';
            }
        });
    });

    document.querySelectorAll('.btn-download').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const docId = btn.dataset.docId;
            try {
                const { blob, filename } = await api.downloadDocument(docId);
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = filename; a.click();
                URL.revokeObjectURL(url);
                showToast('Document downloaded', 'success');
            } catch (err) {
                showToast('Download failed: ' + err.message, 'danger');
            }
        });
    });
}

// ── Evidence Tab ────────────────────────────────────────────────────────

function renderEvidence() {
    const items = caseData.evidence || [];
    return `
    <h3 style="margin-bottom: var(--space-4)">Evidence Items (${items.length})</h3>
    ${items.length === 0 ? `
        <div style="text-align: center; padding: var(--space-10); color: var(--text-secondary)">
            <div style="font-size: 48px; margin-bottom: var(--space-3)">🔬</div>
            <p>No evidence registered yet.</p>
        </div>
    ` : `
        <div style="display: grid; gap: var(--space-3)">
            ${items.map(ev => `
                <div class="card" style="padding: var(--space-4); display: flex; align-items: center; gap: var(--space-4)">
                    <div style="font-size: 28px; flex-shrink: 0">${ev.evidence_type === 'digital' ? '💾' : ev.evidence_type === 'documentary' ? '📄' : '🔍'}</div>
                    <div style="flex: 1">
                        <div style="font-weight: var(--weight-semibold)">${ev.description || 'Evidence Item'}</div>
                        <div style="font-size: var(--text-sm); color: var(--text-secondary)">
                            Type: ${ev.evidence_type} · Status: ${badge(ev.status, 'primary')} · Forensic: ${badge(ev.forensic_status, ev.forensic_status === 'completed' ? 'success' : 'warning')}
                        </div>
                    </div>
                    <div style="text-align: right; font-size: var(--text-xs); color: var(--text-tertiary)">
                        ${formatDate(ev.created_at)}
                    </div>
                </div>
            `).join('')}
        </div>
    `}`;
}

// ── Timeline Tab ────────────────────────────────────────────────────────

function renderTimeline() {
    return `
    <h3 style="margin-bottom: var(--space-4)">Case Timeline</h3>
    <div id="timeline-content" style="padding: var(--space-4)">
        <div style="text-align: center"><div class="spinner spinner-lg" style="margin: var(--space-6) auto"></div></div>
    </div>`;
}

async function loadTimeline() {
    try {
        const data = await api.getCaseTimeline(getCaseId());
        const events = data.timeline || [];
        const container = document.getElementById('timeline-content');

        if (events.length === 0) {
            container.innerHTML = `<div style="text-align: center; padding: var(--space-6); color: var(--text-secondary)">
                <div style="font-size: 48px; margin-bottom: var(--space-3)">🕐</div>
                <p>No timeline events yet.</p>
            </div>`;
            return;
        }

        container.innerHTML = `<div class="timeline-vertical">
            ${events.map((ev, i) => `
                <div class="timeline-event">
                    <div class="timeline-dot ${ev.type}"></div>
                    <div class="timeline-line ${i === events.length - 1 ? 'last' : ''}"></div>
                    <div class="timeline-card">
                        <div class="timeline-date">${formatDate(ev.date)}</div>
                        <div class="timeline-title">${ev.title}</div>
                        <div class="timeline-actor">${ev.actor}${ev.role ? ` · ${ev.role}` : ''}</div>
                        ${ev.description ? `<div class="timeline-desc">${ev.description}</div>` : ''}
                        ${ev.integrity ? `<div style="margin-top: var(--space-1)">${badge(ev.integrity, ev.integrity === 'verified' ? 'success' : 'warning')}</div>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>`;
    } catch (err) {
        document.getElementById('timeline-content').innerHTML = `<p style="color: var(--text-secondary)">Failed to load timeline: ${err.message}</p>`;
    }
}

// ── Blockchain Tab ──────────────────────────────────────────────────────

function renderBlockchain() {
    const records = caseData.blockchain_records || [];
    return `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4)">
        <h3>Blockchain Records (${records.length})</h3>
        <button class="btn btn-outline btn-sm" id="btn-verify-chain">${icons.lock} Verify Full Chain</button>
    </div>
    <div id="chain-status"></div>
    ${records.length === 0 ? `
        <div style="text-align: center; padding: var(--space-10); color: var(--text-secondary)">
            <div style="font-size: 48px; margin-bottom: var(--space-3)">🔗</div>
            <p>No blockchain records for this case. Upload and register documents to create blockchain integrity proofs.</p>
        </div>
    ` : `
        <div style="display: grid; gap: var(--space-3)">
            ${records.map(b => `
                <div class="card blockchain-block" style="padding: var(--space-4)">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3)">
                        <span style="font-weight: var(--weight-bold); font-size: var(--text-lg)">Block #${b.block_index}</span>
                        ${badge(b.status, 'success')}
                    </div>
                    <div class="block-detail"><span class="block-label">Block Hash</span><code class="block-hash">${b.block_hash}</code></div>
                    <div class="block-detail"><span class="block-label">Previous Hash</span><code class="block-hash">${b.previous_hash}</code></div>
                    <div class="block-detail"><span class="block-label">Document Hash</span><code class="block-hash">${b.sha256_hash}</code></div>
                    <div class="block-detail"><span class="block-label">Nonce</span><span>${b.nonce}</span></div>
                    <div class="block-detail"><span class="block-label">Authority</span><span>${b.authority} (${b.authority_type})</span></div>
                    <div class="block-detail"><span class="block-label">Timestamp</span><span>${formatDate(b.timestamp)}</span></div>
                </div>
            `).join('')}
        </div>
    `}`;
}

function initBlockchainHandlers() {
    document.getElementById('btn-verify-chain')?.addEventListener('click', async () => {
        const btn = document.getElementById('btn-verify-chain');
        btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px"></div> Verifying...';
        try {
            const result = await api.verifyFullChain();
            const statusDiv = document.getElementById('chain-status');
            statusDiv.innerHTML = result.valid
                ? `<div class="alert alert-success" style="margin-bottom: var(--space-4)">
                       <span class="alert-icon">✅</span>
                       <div class="alert-content">Chain integrity verified! ${result.blocks_checked} blocks checked, zero violations.</div>
                   </div>`
                : `<div class="alert alert-danger" style="margin-bottom: var(--space-4)">
                       <span class="alert-icon">⚠️</span>
                       <div class="alert-content">CHAIN INTEGRITY VIOLATION! ${result.violations.length} violation(s) detected across ${result.blocks_checked} blocks.</div>
                   </div>`;
            btn.innerHTML = `${icons.lock} Verify Full Chain`;
        } catch (err) {
            showToast('Chain verification failed: ' + err.message, 'danger');
            btn.innerHTML = `${icons.lock} Verify Full Chain`;
        }
    });
}

// ── Audit Tab ───────────────────────────────────────────────────────────

function renderAudit() {
    const logs = caseData.audit_logs || [];
    return `
    <h3 style="margin-bottom: var(--space-4)">Audit Trail (${logs.length} events)</h3>
    ${logs.length === 0 ? `
        <div style="text-align: center; padding: var(--space-6); color: var(--text-secondary)">
            <p>No audit events recorded for this case yet.</p>
        </div>
    ` : `
        <div style="max-height: 500px; overflow-y: auto">
            <table class="data-table">
                <thead><tr>
                    <th>Time</th><th>Action</th><th>User</th><th>Role</th><th>Result</th><th>Severity</th>
                </tr></thead>
                <tbody>
                    ${logs.map(l => `<tr>
                        <td style="font-size: var(--text-xs); white-space: nowrap">${formatDate(l.created_at)}</td>
                        <td><code style="font-size: var(--text-xs)">${l.action}</code></td>
                        <td style="font-size: var(--text-sm)">${l.user_email || l.user_id || '—'}</td>
                        <td>${badge(l.user_role || '—', 'primary')}</td>
                        <td>${badge(l.result, l.result === 'success' ? 'success' : 'danger')}</td>
                        <td>${badge(l.severity, l.severity === 'critical' ? 'danger' : l.severity === 'warning' ? 'warning' : 'info')}</td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>
    `}`;
}

// ── Upload Modal ────────────────────────────────────────────────────────

function showUploadModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'upload-modal';
    modal.innerHTML = `
    <div class="modal-content animate-fade-in" style="max-width: 520px">
        <div class="modal-header">
            <h3>${icons.upload} Upload Document</h3>
            <button class="btn btn-ghost btn-sm modal-close">✕</button>
        </div>
        <div class="modal-body">
            <div class="form-group">
                <label class="form-label">Document Type</label>
                <select class="form-select" id="upload-doc-type">
                    <option value="fir">FIR</option>
                    <option value="chargesheet">Charge Sheet</option>
                    <option value="evidence_report">Evidence Report</option>
                    <option value="forensic_report">Forensic Report</option>
                    <option value="court_order">Court Order</option>
                    <option value="bail_application">Bail Application</option>
                    <option value="witness_statement">Witness Statement</option>
                    <option value="investigation_report">Investigation Report</option>
                    <option value="other" selected>Other</option>
                </select>
            </div>
            <div class="form-group" style="margin-top: var(--space-4)">
                <label class="form-label">File</label>
                <input type="file" class="form-input" id="upload-file" accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif,.doc,.docx,.txt">
                <span class="form-hint">Allowed: PDF, JPG, PNG, TIFF, DOC, DOCX, TXT — Max 50 MB</span>
            </div>
            <div id="upload-preview" style="display:none; margin-top: var(--space-4)"></div>
            <div id="upload-error" class="alert alert-danger" style="display: none; margin-top: var(--space-4)"></div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-ghost modal-close">Cancel</button>
            <button class="btn btn-primary" id="upload-submit">${icons.upload} Upload & Encrypt</button>
        </div>
    </div>`;

    document.body.appendChild(modal);

    // Close handlers
    modal.querySelectorAll('.modal-close').forEach(btn => btn.addEventListener('click', () => modal.remove()));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    // File preview
    document.getElementById('upload-file').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            document.getElementById('upload-preview').style.display = 'block';
            document.getElementById('upload-preview').innerHTML = `
                <div class="card" style="padding: var(--space-3); background: var(--neutral-50); display: flex; align-items: center; gap: var(--space-3)">
                    <span style="font-size: 24px">${getDocIcon(file.type)}</span>
                    <div>
                        <div style="font-weight: var(--weight-medium)">${file.name}</div>
                        <div style="font-size: var(--text-xs); color: var(--text-tertiary)">${formatBytes(file.size)} · ${file.type || 'unknown'}</div>
                    </div>
                </div>`;
        }
    });

    // Submit
    document.getElementById('upload-submit').addEventListener('click', async () => {
        const file = document.getElementById('upload-file').files[0];
        const docType = document.getElementById('upload-doc-type').value;
        const errorDiv = document.getElementById('upload-error');
        const btn = document.getElementById('upload-submit');

        if (!file) {
            errorDiv.textContent = 'Please select a file.';
            errorDiv.style.display = 'block';
            return;
        }

        btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px"></div> Uploading & Encrypting...';
        btn.disabled = true;
        errorDiv.style.display = 'none';

        try {
            const result = await api.uploadDocument(getCaseId(), docType, file);
            showToast(`✅ Document uploaded. SHA-256: ${result.sha256_hash.substring(0, 16)}...`, 'success');

            // Auto-register on blockchain
            try {
                const bcResult = await api.registerOnBlockchain(result.document_id, getCaseId());
                showToast(`🔗 Auto-registered on blockchain — Block #${bcResult.block_index}`, 'success');
            } catch (bcErr) {
                showToast('Document uploaded but blockchain registration failed: ' + bcErr.message, 'warning');
            }

            modal.remove();
            // Reload case data
            caseData = await api.getCase(getCaseId());
            renderCaseHeader();
            renderTabContent();
        } catch (err) {
            errorDiv.textContent = err.message;
            errorDiv.style.display = 'block';
            btn.innerHTML = `${icons.upload} Upload & Encrypt`;
            btn.disabled = false;
        }
    });
}

// ── Utilities ───────────────────────────────────────────────────────────

function formatDate(iso) {
    if (!iso) return '—';
    try {
        const d = new Date(iso);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
}

function formatBytes(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getDocIcon(mimeType) {
    if (!mimeType) return '📄';
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('word') || mimeType.includes('doc')) return '📘';
    if (mimeType.includes('text')) return '📝';
    return '📄';
}
