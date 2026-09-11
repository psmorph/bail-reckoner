/**
 * Bail Reckoner — Case Timeline Page
 */
import { navbar, icons, timeline, badge, disclaimer } from '../components.js';
import { getRole } from '../state.js';
import { sampleTimeline } from '../data.js';

export function render() {
    const role = getRole();
    const roleName = localStorage.getItem('br_role_name') || 'User';

    // Calculate custody days
    const arrestDate = new Date('2025-03-14');
    const today = new Date();
    const custodyDays = Math.floor((today - arrestDate) / (1000 * 60 * 60 * 24));

    return `
    <div class="layout-app">
        ${navbar({ showLinks: false, showRole: true, roleName })}
        <div class="page-content animate-fade-in">
            <div class="page-header">
                <div>
                    <div class="page-breadcrumb">
                        <span class="breadcrumb-link" data-navigate="/purpose">Home</span>
                        <span class="breadcrumb-sep">›</span>
                        <span>Case Timeline</span>
                    </div>
                    <h1 class="page-title">Case Timeline</h1>
                    <p class="page-subtitle">Chronological view of all case events for FIR/2025/DL/004521</p>
                </div>
            </div>

            <div class="grid-cols-3" style="margin-bottom: var(--space-6)">
                <div class="stat-card">
                    <div class="stat-icon" style="background: var(--warning-50)">🕐</div>
                    <div class="stat-value">${custodyDays}</div>
                    <div class="stat-label">Days in Custody</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: var(--primary-50)">📋</div>
                    <div class="stat-value">${sampleTimeline.filter(e => e.status === 'completed').length}</div>
                    <div class="stat-label">Events Completed</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: var(--info-50)">📅</div>
                    <div class="stat-value">10 Jun 2025</div>
                    <div class="stat-label">Next Hearing</div>
                </div>
            </div>

            <div class="card">
                <h3 style="margin-bottom: var(--space-6)">Case Events</h3>
                ${timeline(sampleTimeline)}
            </div>
        </div>
    </div>`;
}

export function init() {}
