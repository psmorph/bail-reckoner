/**
 * Bail Reckoner — Police / Law Enforcement Dashboard
 */
import { navbar, sidebar, icons, statCard, badge, dataTable, alert } from '../components.js';
import { policeSidebarItems } from '../data.js';

export function render() {
    return `
    <div class="layout-dashboard">
        ${navbar({ showLinks: false, showRole: true, roleName: 'Law Enforcement' })}
        ${sidebar(policeSidebarItems, 'dashboard')}
        <div class="page-content animate-fade-in">
            <div style="display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4); background: var(--danger-50); border: 1px solid var(--danger-200); border-radius: var(--radius-md); margin-bottom: var(--space-6); font-size: var(--text-sm); color: var(--danger-700)">
                ${icons.lock} <strong>Confidential / Authorized Access Only</strong> — This dashboard contains sensitive law enforcement information.
            </div>

            <div class="page-header">
                <div>
                    <h1 class="page-title">Law Enforcement Dashboard</h1>
                    <p class="page-subtitle">Manage investigations, FIRs, charge sheets, and court proceedings.</p>
                </div>
                <div class="page-actions">
                    <button class="btn btn-primary btn-sm" data-navigate="/case-upload">${icons.upload} Upload Case Document</button>
                </div>
            </div>

            <!-- Stats -->
            <div class="grid-cols-5" style="margin-bottom: var(--space-6)">
                ${statCard({ icon: '📁', value: '28', label: 'Active Investigations', iconBg: 'var(--primary-50)' })}
                ${statCard({ icon: '📄', value: '5', label: 'Charge Sheets Pending', iconBg: 'var(--warning-50)' })}
                ${statCard({ icon: '📅', value: '8', label: 'Upcoming Court Dates', iconBg: 'var(--info-50)' })}
                ${statCard({ icon: '⚡', value: '12', label: 'Cases Requiring Action', iconBg: 'var(--danger-50)' })}
                ${statCard({ icon: '📊', value: '156', label: 'Total FIRs (Year)', iconBg: 'var(--success-50)' })}
            </div>

            <div class="grid-cols-2" style="margin-bottom: var(--space-6)">
                <!-- Pending Actions -->
                <div class="card">
                    <h3 style="margin-bottom: var(--space-4)">${icons.warning} Pending Actions</h3>
                    ${[
                        { action: 'File charge sheet', case: 'FIR/2025/DL/004890', deadline: '12 Jun 2025', priority: 'Urgent' },
                        { action: 'Submit investigation report', case: 'FIR/2025/DL/005123', deadline: '15 Jun 2025', priority: 'Important' },
                        { action: 'Produce accused in court', case: 'FIR/2025/DL/004521', deadline: 'Tomorrow', priority: 'Urgent' },
                        { action: 'Upload evidence documents', case: 'FIR/2025/DL/005456', deadline: '20 Jun 2025', priority: 'Normal' },
                    ].map(a => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-3); border-bottom: 1px solid var(--neutral-100)">
                            <div>
                                <div style="font-weight: 500; font-size: var(--text-sm)">${a.action}</div>
                                <div style="font-size: var(--text-xs); color: var(--text-tertiary)">${a.case} • Due: ${a.deadline}</div>
                            </div>
                            ${badge(a.priority, a.priority === 'Urgent' ? 'danger' : a.priority === 'Important' ? 'warning' : 'neutral')}
                        </div>
                    `).join('')}
                </div>

                <!-- Document Status -->
                <div class="card">
                    <h3 style="margin-bottom: var(--space-4)">${icons.doc} Recent Document Activity</h3>
                    ${[
                        { doc: 'Charge Sheet — FIR/2025/DL/004521', status: 'Filed', date: '10 May 2025' },
                        { doc: 'FIR — 2025/DL/005678', status: 'Registered', date: '08 Jun 2025' },
                        { doc: 'Investigation Report — FIR/2025/DL/004890', status: 'Draft', date: '07 Jun 2025' },
                        { doc: 'Evidence — FIR/2025/DL/005123', status: 'Uploaded', date: '06 Jun 2025' },
                    ].map(d => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-3); border-bottom: 1px solid var(--neutral-100)">
                            <div>
                                <div style="font-weight: 500; font-size: var(--text-sm)">${d.doc}</div>
                                <div style="font-size: var(--text-xs); color: var(--text-tertiary)">${d.date}</div>
                            </div>
                            ${badge(d.status, d.status === 'Filed' ? 'success' : d.status === 'Draft' ? 'warning' : 'info')}
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Active Cases Table -->
            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">Active Investigations</h3>
                    <button class="btn btn-ghost btn-sm">View All</button>
                </div>
                <div class="card" style="padding: 0; overflow: hidden">
                    ${dataTable({
                        columns: [
                            { label: 'FIR No.', render: r => `<strong>${r.fir}</strong>` },
                            { label: 'Offences', key: 'offences' },
                            { label: 'Accused', key: 'accused' },
                            { label: 'Stage', render: r => badge(r.stage, r.stage === 'Investigation' ? 'warning' : r.stage === 'Charge Sheet Filed' ? 'success' : 'info') },
                            { label: 'Next Court Date', key: 'date' },
                            { label: 'Status', render: r => badge(r.status, r.status === 'Active' ? 'primary' : 'neutral') },
                            { label: '', render: () => `<button class="btn btn-outline btn-sm" data-navigate="/case-analysis">View</button>` },
                        ],
                        rows: [
                            { fir: 'FIR/2025/DL/004521', offences: '§420, 468, 471 IPC', accused: 'Accused A', stage: 'Charge Sheet Filed', date: '10 Jun 2025', status: 'Active' },
                            { fir: 'FIR/2025/DL/004890', offences: '§302, 34 IPC', accused: 'Accused B', stage: 'Investigation', date: '12 Jun 2025', status: 'Active' },
                            { fir: 'FIR/2025/DL/005123', offences: '§376 IPC', accused: 'Accused C', stage: 'Investigation', date: '15 Jun 2025', status: 'Active' },
                            { fir: 'FIR/2025/DL/005456', offences: 'NDPS §20', accused: 'Accused D', stage: 'Pre-Charge Sheet', date: '18 Jun 2025', status: 'Active' },
                        ],
                    })}
                </div>
            </div>
        </div>
    </div>`;
}

export function init() {}
