/**
 * Bail Reckoner — Admin / Legal Database Management
 */
import { navbar, sidebar, icons, badge, statCard, dataTable } from '../components.js';
import { adminSidebarItems } from '../data.js';
import * as api from '../api.js';

export function render() {
    return `
    <div class="layout-dashboard">
        ${navbar({ showLinks: false, showRole: true, roleName: 'Admin' })}
        ${sidebar(adminSidebarItems, 'dashboard')}
        <div class="page-content animate-fade-in">
            <div class="page-header">
                <div>
                    <h1 class="page-title">Admin — Legal Database Management</h1>
                    <p class="page-subtitle">Manage acts, sections, punishments, classifications, and legal updates.</p>
                </div>
            </div>

            <!-- Stats -->
            <div class="grid-cols-5" style="margin-bottom: var(--space-6)">
                <div id="admin-stats" class="grid-cols-5" style="display: contents">
                    ${statCard({ icon: '📚', value: '—', label: 'IPC/BNS Offences', iconBg: 'var(--primary-50)' })}
                    ${statCard({ icon: '📋', value: '—', label: 'Special Statutes', iconBg: 'var(--info-50)' })}
                    ${statCard({ icon: '🔍', value: '—', label: 'Judgments', iconBg: 'var(--success-50)' })}
                    ${statCard({ icon: '✅', value: '—', label: 'Checklist Items', iconBg: 'var(--warning-50)' })}
                    ${statCard({ icon: '📏', value: '—', label: 'Custody Rules', iconBg: 'var(--danger-50)' })}
                </div>
            </div>

            <!-- Module Tabs -->
            <div class="admin-module-tabs">
                <button class="admin-tab active" data-module="offenses">Acts & Sections</button>
                <button class="admin-tab" data-module="special">Special Statutes</button>
                <button class="admin-tab" data-module="judgments">Judicial Precedents</button>
                <button class="admin-tab" data-module="checklist">Procedural Checklist</button>
                <button class="admin-tab" data-module="custody">Custody Rules</button>
                <button class="admin-tab" data-module="audit">Audit Logs</button>
            </div>

            <!-- Module Content -->
            <div class="card" style="padding: 0; overflow: hidden" id="admin-module-content">
                <div class="loading-overlay" style="padding: var(--space-8)">
                    <div class="spinner spinner-lg"></div>
                    <div>Loading data...</div>
                </div>
            </div>

            <!-- Verification Info -->
            <div class="card" style="margin-top: var(--space-6); font-size: var(--text-sm); background: var(--neutral-50)">
                <h4 style="margin-bottom: var(--space-3)">Data Verification Standards</h4>
                <div class="grid-cols-3" style="gap: var(--space-4)">
                    <div>
                        <div style="font-weight: 600; margin-bottom: var(--space-1)">Source</div>
                        <div style="color: var(--text-secondary); font-size: var(--text-xs)">All provisions must reference an authoritative bare Act, gazette notification, or official amendment.</div>
                    </div>
                    <div>
                        <div style="font-weight: 600; margin-bottom: var(--space-1)">Version Control</div>
                        <div style="color: var(--text-secondary); font-size: var(--text-xs)">Each provision includes effective date, last verified date, verified by, and change history.</div>
                    </div>
                    <div>
                        <div style="font-weight: 600; margin-bottom: var(--space-1)">Audit Trail</div>
                        <div style="color: var(--text-secondary); font-size: var(--text-xs)">All modifications are logged with user, timestamp, and description of change.</div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}

export async function init() {
    // Load stats
    try {
        const stats = await api.getStats();
        // Update stat values if available
        const statValues = document.querySelectorAll('.stat-value');
        const keys = ['offenses', 'special_acts_offenses', 'judgments', 'procedural_checklist', 'custody_rules'];
        keys.forEach((key, i) => {
            if (stats[key] != null && statValues[i]) {
                statValues[i].textContent = stats[key].toString();
            }
        });
    } catch (e) { /* ignore */ }

    // Tab switching
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', async () => {
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            await loadModule(tab.dataset.module);
        });
    });

    // Load initial module
    await loadModule('offenses');
}

async function loadModule(module) {
    const container = document.getElementById('admin-module-content');
    container.innerHTML = '<div class="loading-overlay" style="padding: var(--space-8)"><div class="spinner spinner-lg"></div><div>Loading...</div></div>';

    try {
        if (module === 'offenses') {
            const { provisions } = await api.getProvisions({ limit: 50 });
            const ipcOnly = provisions.filter(p => p.source_type === 'IPC/BNS');
            container.innerHTML = dataTable({
                columns: [
                    { label: 'IPC §', render: r => `<strong>${r.ipc_section || '—'}</strong>` },
                    { label: 'BNS §', render: r => r.bns_section || '—' },
                    { label: 'Offence', key: 'offense_name' },
                    { label: 'Category', render: r => badge(r.category || '—', 'info') },
                    { label: 'Punishment', render: r => `${r.min_punishment_years || 0}–${r.max_punishment_years || '—'} yrs` },
                    { label: 'Bail', render: r => badge(r.bailable || '—', r.bailable === 'bailable' ? 'success' : 'warning') },
                    { label: 'Cognizable', render: r => badge(r.cognizable || '—', 'neutral') },
                ],
                rows: ipcOnly,
            });
        } else if (module === 'special') {
            const { provisions } = await api.getProvisions({ limit: 50 });
            const special = provisions.filter(p => p.source_type === 'Special Act');
            container.innerHTML = dataTable({
                columns: [
                    { label: 'Act', key: 'act_name' },
                    { label: 'Section', render: r => `<strong>§${r.section}</strong>` },
                    { label: 'Offence', key: 'offense_name' },
                    { label: 'Punishment', render: r => `${r.min_punishment_years || 0}–${r.max_punishment_years || '—'} yrs` },
                    { label: 'Bail', render: r => badge(r.bailable || '—', r.bailable === 'bailable' ? 'success' : 'warning') },
                ],
                rows: special,
            });
        } else if (module === 'judgments') {
            const { judgments } = await api.getLandmarkJudgments();
            container.innerHTML = dataTable({
                columns: [
                    { label: 'Case', render: r => `<strong>${r.case_name}</strong>` },
                    { label: 'Citation', key: 'citation' },
                    { label: 'Year', key: 'year' },
                    { label: 'Court', key: 'court' },
                    { label: 'Categories', render: r => (r.applicable_categories || '').split(',').map(c => badge(c.trim(), 'info')).join(' ') },
                ],
                rows: judgments,
            });
        } else if (module === 'checklist') {
            const { items } = await api.getChecklist();
            container.innerHTML = dataTable({
                columns: [
                    { label: 'Category', render: r => badge(r.category, 'primary') },
                    { label: 'Bail Type', render: r => badge(r.bail_type, 'info') },
                    { label: 'Requirement', key: 'requirement' },
                    { label: 'Mandatory', render: r => r.is_mandatory ? badge('Yes', 'danger') : badge('No', 'neutral') },
                ],
                rows: items,
            });
        } else if (module === 'custody') {
            const { rules } = await api.getCustodyRules();
            container.innerHTML = dataTable({
                columns: [
                    { label: 'Rule', render: r => `<strong>${r.rule_name}</strong>` },
                    { label: 'Source', key: 'source_provision' },
                    { label: 'Threshold', render: r => `${(r.threshold_fraction * 100).toFixed(0)}%` },
                    { label: 'Applies To', key: 'applies_to' },
                ],
                rows: rules,
            });
        } else if (module === 'audit') {
            container.innerHTML = `<div style="padding: var(--space-8); text-align: center; color: var(--text-secondary)">
                <div style="font-size: 40px; margin-bottom: var(--space-3)">🔒</div>
                <div style="font-weight: 600">Audit Log</div>
                <div style="font-size: var(--text-sm)">All database modifications are logged. Audit log viewer will be available in the next release.</div>
            </div>`;
        }
    } catch (e) {
        container.innerHTML = `<div style="padding: var(--space-6); text-align: center; color: var(--danger-600)">${icons.danger} Error loading data: ${e.message}</div>`;
    }
}
