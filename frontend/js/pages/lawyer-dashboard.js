/**
 * Bail Reckoner — Lawyer Dashboard
 */
import { navbar, sidebar, icons, statCard, badge, dataTable } from '../components.js';
import { lawyerSidebarItems } from '../data.js';

export function render() {
    return `
    <div class="layout-dashboard">
        ${navbar({ showLinks: false, showRole: true, roleName: 'Lawyer' })}
        ${sidebar(lawyerSidebarItems, 'dashboard')}
        <div class="page-content animate-fade-in">
            <div class="page-header">
                <div>
                    <h1 class="page-title">Dashboard</h1>
                    <p class="page-subtitle">Welcome back. Here's an overview of your practice.</p>
                </div>
                <div class="page-actions">
                    <button class="btn btn-outline btn-sm" data-navigate="/case-upload">${icons.plus} New Case Analysis</button>
                </div>
            </div>

            <!-- Stats -->
            <div class="grid-cols-4" style="margin-bottom: var(--space-6)">
                ${statCard({ icon: '📁', value: '12', label: 'Active Cases', iconBg: 'var(--primary-50)', change: '+2 this week', changeType: 'up' })}
                ${statCard({ icon: '📨', value: '3', label: 'New Client Requests', iconBg: 'var(--warning-50)', change: 'Requires action', changeType: '' })}
                ${statCard({ icon: '📅', value: '5', label: 'Upcoming Hearings', iconBg: 'var(--info-50)', change: 'Next: Tomorrow', changeType: '' })}
                ${statCard({ icon: '📄', value: '8', label: 'Documents Pending', iconBg: 'var(--danger-50)', change: '3 urgent', changeType: 'down' })}
            </div>

            <div class="grid-cols-2" style="margin-bottom: var(--space-6)">
                <!-- Bail Matters Quick View -->
                <div class="card">
                    <h3 style="margin-bottom: var(--space-4)">${icons.scales} Active Bail Matters</h3>
                    <div style="display: grid; gap: var(--space-3)">
                        ${[
                            { case: 'FIR/2025/DL/004521', client: 'Client A', stage: 'Bail Hearing', date: '10 Jun 2025', status: 'Pending' },
                            { case: 'FIR/2025/MH/001234', client: 'Client B', stage: 'Application Filed', date: '15 Jun 2025', status: 'Filed' },
                            { case: 'FIR/2024/DL/009876', client: 'Client C', stage: 'Bail Granted', date: '01 May 2025', status: 'Granted' },
                        ].map(b => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-3); border: 1px solid var(--border-light); border-radius: var(--radius-md); cursor: pointer" class="card-clickable" data-navigate="/case-analysis">
                                <div>
                                    <div style="font-weight: 500; font-size: var(--text-sm)">${b.case}</div>
                                    <div style="font-size: var(--text-xs); color: var(--text-secondary)">${b.client} • ${b.stage}</div>
                                </div>
                                <div style="text-align: right">
                                    ${badge(b.status, b.status === 'Granted' ? 'success' : b.status === 'Pending' ? 'warning' : 'info')}
                                    <div style="font-size: var(--text-xs); color: var(--text-tertiary); margin-top: 2px">${b.date}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Upcoming Hearings -->
                <div class="card">
                    <h3 style="margin-bottom: var(--space-4)">${icons.calendar} Upcoming Hearings</h3>
                    <div style="display: grid; gap: var(--space-3)">
                        ${[
                            { date: 'Tomorrow', time: '10:30 AM', court: 'Patiala House Court', case: 'FIR/2025/DL/004521', type: 'Bail Hearing' },
                            { date: '12 Jun', time: '2:00 PM', court: 'Saket Court', case: 'FIR/2025/DL/007654', type: 'Arguments' },
                            { date: '15 Jun', time: '11:00 AM', court: 'Delhi High Court', case: 'CRL.A/2025/1234', type: 'Anticipatory Bail' },
                        ].map(h => `
                            <div style="display: flex; gap: var(--space-3); padding: var(--space-3); background: var(--neutral-50); border-radius: var(--radius-md)">
                                <div style="min-width: 60px; text-align: center; padding: var(--space-2); background: var(--primary-50); border-radius: var(--radius-md)">
                                    <div style="font-weight: 700; color: var(--primary-600); font-size: var(--text-sm)">${h.date}</div>
                                    <div style="font-size: var(--text-xs); color: var(--primary-500)">${h.time}</div>
                                </div>
                                <div>
                                    <div style="font-weight: 500; font-size: var(--text-sm)">${h.type}</div>
                                    <div style="font-size: var(--text-xs); color: var(--text-secondary)">${h.court}</div>
                                    <div style="font-size: var(--text-xs); color: var(--text-tertiary)">${h.case}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- Client Requests Table -->
            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">Recent Client Requests</h3>
                    <button class="btn btn-ghost btn-sm">View All ${icons.arrow}</button>
                </div>
                <div class="card" style="padding: 0; overflow: hidden">
                    ${dataTable({
                        columns: [
                            { label: 'Case Type', render: r => `<strong>${r.type}</strong>` },
                            { label: 'Court', key: 'court' },
                            { label: 'Provisions', render: r => badge(r.provisions, 'neutral') },
                            { label: 'Stage', key: 'stage' },
                            { label: 'Date', key: 'date' },
                            { label: 'Status', render: r => badge(r.status, r.status === 'New' ? 'primary' : r.status === 'Accepted' ? 'success' : 'neutral') },
                            { label: 'Action', render: () => `<button class="btn btn-outline btn-sm" data-navigate="/case-analysis">View</button>` },
                        ],
                        rows: [
                            { type: 'Bail Application', court: 'Patiala House', provisions: '§420, 468 IPC', stage: 'Pre-Trial', date: '08 Jun 2025', status: 'New' },
                            { type: 'Criminal Defence', court: 'Saket Court', provisions: '§306, 34 IPC', stage: 'Trial', date: '05 Jun 2025', status: 'New' },
                            { type: 'Anticipatory Bail', court: 'Delhi HC', provisions: '§498A IPC', stage: 'Pre-Arrest', date: '03 Jun 2025', status: 'Accepted' },
                            { type: 'Regular Bail', court: 'Tis Hazari', provisions: '§379, 411 IPC', stage: 'Post Charge Sheet', date: '01 Jun 2025', status: 'New' },
                        ],
                    })}
                </div>
            </div>
        </div>
    </div>`;
}

export function init() {}
