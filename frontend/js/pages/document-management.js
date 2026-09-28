/**
 * NyaySetu — Document Management Page
 * Connects to the real /api/documents endpoints with upload, verify, download.
 */
import { navbar, icons, badge, showToast } from '../components.js';
import { getRole, isAuthenticated, getAuthUser } from '../state.js';
import * as api from '../api.js';

let documents = [];
let activeFilter = 'all';

export function render() {
    const roleName = localStorage.getItem('br_role_name') || 'User';

    return `
    <div class="layout-app">
        ${navbar({ showLinks: false, showRole: true, roleName })}
        <div class="page-content animate-fade-in">
            <div class="page-header">
                <div>
                    <div class="page-breadcrumb">
                        <span class="breadcrumb-link" data-navigate="/purpose">Home</span>
                        <span class="breadcrumb-sep">›</span>
                        <span>Documents</span>
                    </div>
                    <h1 class="page-title">Document Management</h1>
                    <p class="page-subtitle" id="doc-subtitle">Secure, encrypted document vault with blockchain integrity verification</p>
                </div>
                <div class="page-actions">
                    <button class="btn btn-primary btn-sm" id="btn-upload-doc">${icons.upload} Upload Document</button>
                </div>
            </div>

            <!-- Stats Row -->
            <div class="grid-cols-4" id="doc-stats" style="margin-bottom: var(--space-6)">
                <div class="stat-card">
                    <div class="stat-icon" style="background: var(--primary-50)">📄</div>
                    <div class="stat-value" id="stat-total">—</div>
                    <div class="stat-label">Total Documents</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: var(--success-50)">✅</div>
                    <div class="stat-value" id="stat-verified">—</div>
                    <div class="stat-label">Verified</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: var(--info-50)">🔒</div>
                    <div class="stat-value" id="stat-encrypted">—</div>
                    <div class="stat-label">Encrypted</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: var(--warning-50)">🔗</div>
                    <div class="stat-value" id="stat-blockchain">—</div>
                    <div class="stat-label">On Blockchain</div>
                </div>
            </div>

            <!-- Category Tabs -->
            <div class="tabs" style="margin-bottom: var(--space-4)">
                <div class="tab active" data-filter="all">All Documents</div>
                <div class="tab" data-filter="fir">FIR</div>
                <div class="tab" data-filter="chargesheet">Chargesheet</div>
                <div class="tab" data-filter="evidence_report">Evidence</div>
                <div class="tab" data-filter="court_order">Court Orders</div>
                <div class="tab" data-filter="bail_application">Bail Applications</div>
            </div>

            <!-- Document List -->
            <div id="doc-list">
                <div style="text-align: center; padding: var(--space-10)">
                    <div class="spinner spinner-lg" style="margin: 0 auto"></div>
                </div>
            </div>
        </div>
    </div>`;
}

export async function init() {
    // Tab filtering
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeFilter = tab.dataset.filter;
            renderDocList();
        });
    });

    // Upload button
    document.getElementById('btn-upload-doc')?.addEventListener('click', showUploadModal);

    await loadDocuments();
}

async function loadDocuments() {
    const container = document.getElementById('doc-list');

    if (!isAuthenticated()) {
        container.innerHTML = `
            <div class="card" style="text-align: center; padding: var(--space-10)">
                <div style="font-size: 48px; margin-bottom: var(--space-3)">🔒</div>
                <h3>Please log in</h3>
                <p style="color: var(--text-secondary); margin-top: var(--space-2)">You need to be logged in to view documents.</p>
                <button class="btn btn-primary" style="margin-top: var(--space-4)" data-navigate="/login">Log In</button>
            </div>`;
        return;
    }

    try {
        const data = await api.listDocuments({ limit: 100 });
        documents = data.documents || [];

        // Update stats
        document.getElementById('stat-total').textContent = documents.length.toString();
        document.getElementById('stat-verified').textContent = documents.filter(d => d.integrity_verified).length.toString();
        document.getElementById('stat-encrypted').textContent = documents.filter(d => d.encrypted).length.toString();
        document.getElementById('stat-blockchain').textContent = documents.filter(d => d.blockchain_tx_id).length.toString();

        renderDocList();
    } catch (err) {
        container.innerHTML = `<div class="card" style="padding: var(--space-6); text-align: center; color: var(--text-secondary)">
            Failed to load documents: ${err.message}. Make sure you're logged in.
        </div>`;
    }
}

function renderDocList() {
    const container = document.getElementById('doc-list');
    const filtered = activeFilter === 'all' ? documents : documents.filter(d => d.doc_type === activeFilter);

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="card" style="text-align: center; padding: var(--space-10)">
                <div style="font-size: 48px; margin-bottom: var(--space-3)">📂</div>
                <h3>No Documents Found</h3>
                <p style="color: var(--text-secondary); margin-top: var(--space-2)">
                    ${activeFilter === 'all' ? 'Upload your first document to get started.' : `No ${activeFilter.replace('_', ' ')} documents found.`}
                </p>
                <button class="btn btn-primary" style="margin-top: var(--space-4)" id="btn-upload-empty">${icons.upload} Upload Document</button>
            </div>`;
        document.getElementById('btn-upload-empty')?.addEventListener('click', showUploadModal);
        return;
    }

    container.innerHTML = `
        <div style="font-size: var(--text-sm); color: var(--text-tertiary); margin-bottom: var(--space-3)">
            Showing ${filtered.length} document${filtered.length !== 1 ? 's' : ''}
        </div>
        <div style="display: grid; gap: var(--space-3)">
            ${filtered.map(d => renderDocCard(d)).join('')}
        </div>`;

    // Attach action handlers
    container.querySelectorAll('.doc-verify-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const docId = btn.dataset.docId;
            btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px"></div>';
            btn.disabled = true;
            try {
                const result = await api.verifyDocument(docId);
                showToast(`Document verification: ${result.integrity_status || 'verified'} ${result.hash_match ? '✅' : '⚠️'}`, result.hash_match ? 'success' : 'warning');
                await loadDocuments();
            } catch (err) {
                showToast('Verification failed: ' + err.message, 'error');
                btn.innerHTML = `${icons.shield} Verify`;
                btn.disabled = false;
            }
        });
    });

    container.querySelectorAll('.doc-blockchain-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const docId = btn.dataset.docId;
            const caseId = btn.dataset.caseId || '';
            btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px"></div>';
            btn.disabled = true;
            try {
                const result = await api.registerOnBlockchain(docId, caseId);
                showToast(`Registered on blockchain! Block #${result.block_index}, Nonce: ${result.nonce}`, 'success');
                await loadDocuments();
            } catch (err) {
                showToast('Blockchain registration failed: ' + err.message, 'error');
                btn.innerHTML = `${icons.link} Register`;
                btn.disabled = false;
            }
        });
    });

    container.querySelectorAll('.doc-download-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const docId = btn.dataset.docId;
            try {
                const result = await api.downloadDocument(docId);
                const url = URL.createObjectURL(result.blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = result.filename || 'document';
                a.click();
                URL.revokeObjectURL(url);
                showToast('Download started', 'success');
            } catch (err) {
                showToast('Download failed: ' + err.message, 'error');
            }
        });
    });
}

function renderDocCard(doc) {
    const typeLabel = (doc.doc_type || 'document').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const ext = (doc.original_filename || '').split('.').pop()?.toUpperCase() || 'FILE';
    const typeIcon = ext === 'PDF' ? '📕' : ext === 'JPG' || ext === 'JPEG' || ext === 'PNG' ? '🖼️' : '📄';
    const dateStr = formatDate(doc.uploaded_at);
    const sizeStr = formatSize(doc.file_size);

    return `
    <div class="doc-card" style="cursor: pointer" data-navigate="/case-details/${doc.case_id}">
        <div class="doc-icon" style="font-size: 24px">${typeIcon}</div>
        <div class="doc-info" style="flex: 1; min-width: 0">
            <div class="doc-name" style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">
                ${doc.original_filename || doc.id}
            </div>
            <div class="doc-meta" style="font-size: var(--text-xs); color: var(--text-tertiary)">
                ${badge(typeLabel, 'info')}
                ${sizeStr} • ${dateStr}
                ${doc.case_id ? ` • ${doc.case_id}` : ''}
            </div>
        </div>
        <div class="doc-actions" style="display: flex; gap: var(--space-2); align-items: center; flex-wrap: wrap">
            ${doc.encrypted ? badge('Encrypted', 'success') : ''}
            ${doc.blockchain_tx_id ? badge('On-Chain', 'primary') : ''}
            ${doc.integrity_verified ? badge('Verified', 'success') : badge('Unverified', 'warning')}
            <button class="btn btn-ghost btn-sm doc-verify-btn" data-doc-id="${doc.id}" title="Verify integrity">${icons.shield} Verify</button>
            ${!doc.blockchain_tx_id ? `<button class="btn btn-ghost btn-sm doc-blockchain-btn" data-doc-id="${doc.id}" data-case-id="${doc.case_id || ''}" title="Register on blockchain">${icons.link} Register</button>` : ''}
            <button class="btn btn-ghost btn-sm doc-download-btn" data-doc-id="${doc.id}" title="Download">${icons.download}</button>
        </div>
    </div>`;
}

function showUploadModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
    <div class="modal-content animate-fade-in" style="max-width: 520px">
        <div class="modal-header">
            <h3>${icons.upload} Upload Document</h3>
            <button class="btn btn-ghost btn-sm modal-close">✕</button>
        </div>
        <div class="modal-body">
            <div class="form-group">
                <label class="form-label">Case ID *</label>
                <input type="text" class="form-input" id="upload-case-id" placeholder="e.g., CASE-2026-00001">
            </div>
            <div class="form-group" style="margin-top: var(--space-4)">
                <label class="form-label">Document Type</label>
                <select class="form-select" id="upload-doc-type">
                    <option value="fir">FIR</option>
                    <option value="chargesheet">Chargesheet</option>
                    <option value="evidence_report">Evidence Report</option>
                    <option value="court_order">Court Order</option>
                    <option value="bail_application">Bail Application</option>
                    <option value="witness_statement">Witness Statement</option>
                    <option value="other">Other</option>
                </select>
            </div>
            <div class="form-group" style="margin-top: var(--space-4)">
                <label class="form-label">File *</label>
                <div class="upload-zone" id="upload-drop-zone" style="padding: var(--space-6); text-align: center; border: 2px dashed var(--border); border-radius: var(--radius-lg); cursor: pointer">
                    <div style="font-size: 32px; margin-bottom: var(--space-2)">${icons.upload}</div>
                    <div style="font-weight: 500">Drop file here or click to browse</div>
                    <div style="font-size: var(--text-xs); color: var(--text-tertiary); margin-top: var(--space-1)">
                        PDF, JPG, PNG, TXT, DOC, DOCX — Max 50 MB
                    </div>
                    <div id="upload-file-name" style="margin-top: var(--space-2); font-weight: 600; color: var(--primary-600); display: none"></div>
                </div>
                <input type="file" id="upload-file-input" accept=".pdf,.jpg,.jpeg,.png,.txt,.doc,.docx,.tiff" style="display: none">
            </div>
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

    // File input
    const fileInput = document.getElementById('upload-file-input');
    const dropZone = document.getElementById('upload-drop-zone');
    const fileNameDiv = document.getElementById('upload-file-name');

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = 'var(--primary-500)'; });
    dropZone.addEventListener('dragleave', () => { dropZone.style.borderColor = 'var(--border)'; });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--border)';
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            fileNameDiv.textContent = `📎 ${e.dataTransfer.files[0].name}`;
            fileNameDiv.style.display = 'block';
        }
    });
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) {
            fileNameDiv.textContent = `📎 ${fileInput.files[0].name}`;
            fileNameDiv.style.display = 'block';
        }
    });

    // Submit
    document.getElementById('upload-submit').addEventListener('click', async () => {
        const caseId = document.getElementById('upload-case-id').value.trim();
        const docType = document.getElementById('upload-doc-type').value;
        const file = fileInput.files[0];
        const errorDiv = document.getElementById('upload-error');

        if (!caseId) {
            errorDiv.textContent = 'Case ID is required.';
            errorDiv.style.display = 'block';
            return;
        }
        if (!file) {
            errorDiv.textContent = 'Please select a file.';
            errorDiv.style.display = 'block';
            return;
        }

        const btn = document.getElementById('upload-submit');
        btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px"></div> Uploading...';
        btn.disabled = true;

        try {
            const result = await api.uploadDocument(caseId, docType, file);
            showToast(`✅ Document uploaded and encrypted! ID: ${result.document_id}`, 'success');
            modal.remove();
            await loadDocuments();
        } catch (err) {
            errorDiv.textContent = err.message;
            errorDiv.style.display = 'block';
            btn.innerHTML = `${icons.upload} Upload & Encrypt`;
            btn.disabled = false;
        }
    });
}

function formatDate(iso) {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return iso; }
}

function formatSize(bytes) {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
