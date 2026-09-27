/**
 * Bail Reckoner Platform — Case Search & List Page
 * Search, filter, and create cases.
 */
import { navbar, icons, badge, statCard, showToast } from '../components.js';
import { getRole, getAuthUser, isAuthenticated, hasPermission } from '../state.js';
import * as api from '../api.js';

let cases = [];
let stats = {};
let searchTimeout = null;

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
                        <span>Case Management</span>
                    </div>
                    <h1 class="page-title">Case Management</h1>
                    <p class="page-subtitle">Search, manage, and track all cases in the platform.</p>
                </div>
                <div class="page-actions">
                    <button class="btn btn-primary" id="btn-new-case">${icons.plus || '+'} New Case</button>
                </div>
            </div>

            <!-- Stats -->
            <div class="grid-cols-5" id="case-stats" style="margin-bottom: var(--space-6)">
                ${statCard({ icon: '📋', value: '—', label: 'Total Cases', iconBg: 'var(--primary-50)' })}
                ${statCard({ icon: '✅', value: '—', label: 'Active', iconBg: 'var(--success-50)' })}
                ${statCard({ icon: '📁', value: '—', label: 'Closed', iconBg: 'var(--neutral-100)' })}
                ${statCard({ icon: '📄', value: '—', label: 'Documents', iconBg: 'var(--info-50)' })}
                ${statCard({ icon: '🔍', value: '—', label: 'Evidence', iconBg: 'var(--warning-50)' })}
            </div>

            <!-- Search & Filters -->
            <div class="card" style="padding: var(--space-4); margin-bottom: var(--space-4)">
                <div style="display: flex; gap: var(--space-3); flex-wrap: wrap; align-items: center">
                    <div style="flex: 1; min-width: 250px">
                        <input type="text" class="form-input" id="case-search" placeholder="Search by case ID, title, FIR number, accused name, or sections...">
                    </div>
                    <select class="form-select" id="filter-status" style="width: 150px">
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="closed">Closed</option>
                        <option value="transferred">Transferred</option>
                    </select>
                    <select class="form-select" id="filter-priority" style="width: 150px">
                        <option value="">All Priority</option>
                        <option value="high">High</option>
                        <option value="normal">Normal</option>
                        <option value="low">Low</option>
                    </select>
                </div>
            </div>

            <!-- Case List -->
            <div id="case-list">
                <div style="text-align: center; padding: var(--space-10)">
                    <div class="spinner spinner-lg" style="margin: 0 auto"></div>
                </div>
            </div>
        </div>
    </div>`;
}

export async function init() {
    // New case button
    document.getElementById('btn-new-case')?.addEventListener('click', showCreateCaseModal);

    // Search with debounce
    document.getElementById('case-search')?.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(loadCases, 400);
    });

    document.getElementById('filter-status')?.addEventListener('change', loadCases);
    document.getElementById('filter-priority')?.addEventListener('change', loadCases);

    // Load data
    await Promise.all([loadStats(), loadCases()]);
}

async function loadStats() {
    try {
        stats = await api.getCaseStats();
        document.getElementById('case-stats').innerHTML = `
            ${statCard({ icon: '📋', value: stats.total_cases?.toString() || '0', label: 'Total Cases', iconBg: 'var(--primary-50)' })}
            ${statCard({ icon: '✅', value: stats.active_cases?.toString() || '0', label: 'Active', iconBg: 'var(--success-50)' })}
            ${statCard({ icon: '📁', value: stats.closed_cases?.toString() || '0', label: 'Closed', iconBg: 'var(--neutral-100)' })}
            ${statCard({ icon: '📄', value: stats.document_count?.toString() || '0', label: 'Documents', iconBg: 'var(--info-50)' })}
            ${statCard({ icon: '🔍', value: stats.evidence_count?.toString() || '0', label: 'Evidence', iconBg: 'var(--warning-50)' })}
        `;
    } catch (err) { /* silently fail stats */ }
}

async function loadCases() {
    const search = document.getElementById('case-search')?.value || '';
    const status = document.getElementById('filter-status')?.value || '';
    const priority = document.getElementById('filter-priority')?.value || '';
    const container = document.getElementById('case-list');

    try {
        const data = await api.listCases({ search, status, priority, limit: 50 });
        cases = data.cases || [];

        if (cases.length === 0) {
            container.innerHTML = `
                <div class="card" style="text-align: center; padding: var(--space-10)">
                    <div style="font-size: 48px; margin-bottom: var(--space-3)">📂</div>
                    <h3>No Cases Found</h3>
                    <p style="color: var(--text-secondary); margin-top: var(--space-2)">${search ? 'No cases match your search.' : 'Create your first case to get started.'}</p>
                    <button class="btn btn-primary" style="margin-top: var(--space-4)" id="btn-new-case-empty">${icons.plus || '+'} Create New Case</button>
                </div>`;
            document.getElementById('btn-new-case-empty')?.addEventListener('click', showCreateCaseModal);
            return;
        }

        container.innerHTML = `
            <div style="font-size: var(--text-sm); color: var(--text-tertiary); margin-bottom: var(--space-3)">
                Showing ${cases.length} of ${data.total} cases
            </div>
            <div class="case-list-grid">
                ${cases.map(c => `
                    <div class="case-list-item" data-navigate="/case-details/${c.id}" style="cursor: pointer">
                        <div class="case-list-header">
                            <div>
                                <span class="case-list-id">${c.id}</span>
                                ${c.fir_number ? `<span class="case-list-fir">${c.fir_number}</span>` : ''}
                            </div>
                            <div class="case-list-badges">
                                ${badge(c.status, c.status === 'active' ? 'success' : 'danger')}
                                ${badge(c.priority, c.priority === 'high' ? 'warning' : 'primary')}
                            </div>
                        </div>
                        <div class="case-list-title">${c.title}</div>
                        <div class="case-list-meta">
                            ${c.sections ? `<span>§ ${c.sections}</span>` : ''}
                            ${c.accused_name ? `<span>Accused: ${c.accused_name}</span>` : ''}
                            ${c.org_name ? `<span>${c.org_name}</span>` : ''}
                        </div>
                        <div class="case-list-footer">
                            <span>Created by ${c.creator_name || 'Unknown'}</span>
                            <span>${formatDate(c.created_at)}</span>
                        </div>
                    </div>
                `).join('')}
            </div>`;

    } catch (err) {
        container.innerHTML = `<div class="card" style="padding: var(--space-6); text-align: center; color: var(--text-secondary)">
            Failed to load cases: ${err.message}. Make sure you're logged in.
        </div>`;
    }
}

function showCreateCaseModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
    <div class="modal-content animate-fade-in" style="max-width: 640px">
        <div class="modal-header">
            <h3>Create New Case</h3>
            <button class="btn btn-ghost btn-sm modal-close">✕</button>
        </div>
        <div class="modal-body">
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Case Title *</label>
                    <input type="text" class="form-input" id="nc-title" placeholder="e.g., State v. Accused Name">
                </div>
                <div class="form-group">
                    <label class="form-label">FIR Number</label>
                    <input type="text" class="form-input" id="nc-fir" placeholder="e.g., FIR/2026/DL/001234">
                </div>
            </div>
            <div class="form-row" style="margin-top: var(--space-4)">
                <div class="form-group">
                    <label class="form-label">IPC/BNS Sections</label>
                    <input type="text" class="form-input" id="nc-sections" placeholder="e.g., 420, 468, 471">
                </div>
                <div class="form-group">
                    <label class="form-label">Priority</label>
                    <select class="form-select" id="nc-priority">
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="low">Low</option>
                    </select>
                </div>
            </div>
            <div class="form-row" style="margin-top: var(--space-4)">
                <div class="form-group">
                    <label class="form-label">Accused Name</label>
                    <input type="text" class="form-input" id="nc-accused" placeholder="Full name of accused">
                </div>
                <div class="form-group">
                    <label class="form-label">Complainant</label>
                    <input type="text" class="form-input" id="nc-complainant" placeholder="Full name of complainant">
                </div>
            </div>
            <div class="form-row" style="margin-top: var(--space-4)">
                <div class="form-group">
                    <label class="form-label">Police Station</label>
                    <input type="text" class="form-input" id="nc-ps" placeholder="e.g., PS Connaught Place">
                </div>
                <div class="form-group">
                    <label class="form-label">District</label>
                    <input type="text" class="form-input" id="nc-district" placeholder="e.g., Central Delhi">
                </div>
            </div>
            <div class="form-group" style="margin-top: var(--space-4)">
                <label class="form-label">Description</label>
                <textarea class="form-textarea" id="nc-desc" rows="3" placeholder="Brief description of the case facts..."></textarea>
            </div>
            <div id="nc-error" class="alert alert-danger" style="display: none; margin-top: var(--space-4)"></div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-ghost modal-close">Cancel</button>
            <button class="btn btn-primary" id="nc-submit">${icons.plus || '+'} Create Case</button>
        </div>
    </div>`;

    document.body.appendChild(modal);
    modal.querySelectorAll('.modal-close').forEach(btn => btn.addEventListener('click', () => modal.remove()));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    document.getElementById('nc-submit').addEventListener('click', async () => {
        const title = document.getElementById('nc-title').value.trim();
        if (!title) {
            document.getElementById('nc-error').textContent = 'Case title is required.';
            document.getElementById('nc-error').style.display = 'block';
            return;
        }

        const btn = document.getElementById('nc-submit');
        btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px"></div> Creating...';
        btn.disabled = true;

        try {
            const result = await api.createCase({
                title,
                fir_number: document.getElementById('nc-fir').value.trim(),
                sections: document.getElementById('nc-sections').value.trim(),
                priority: document.getElementById('nc-priority').value,
                accused_name: document.getElementById('nc-accused').value.trim(),
                complainant_name: document.getElementById('nc-complainant').value.trim(),
                police_station: document.getElementById('nc-ps').value.trim(),
                district: document.getElementById('nc-district').value.trim(),
                description: document.getElementById('nc-desc').value.trim(),
                state: 'Delhi',
            });

            showToast(`✅ Case ${result.case_id} created successfully!`, 'success');
            modal.remove();
            window.location.hash = `#/case-details/${result.case_id}`;
        } catch (err) {
            document.getElementById('nc-error').textContent = err.message;
            document.getElementById('nc-error').style.display = 'block';
            btn.innerHTML = `${icons.plus || '+'} Create Case`;
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
