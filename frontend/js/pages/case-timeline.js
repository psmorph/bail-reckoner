/**
 * NyaySetu — Case Timeline Page
 * Connects to real /api/cases/{id}/timeline endpoint.
 * Reads case ID from URL hash or from current case in session.
 */
import { navbar, icons, timeline, badge, statCard, showToast } from '../components.js';
import { getRole, isAuthenticated, getCurrentCase } from '../state.js';
import * as api from '../api.js';

let caseData = null;
let timelineEvents = [];

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
                        <span class="breadcrumb-link" data-navigate="/case-search">Cases</span>
                        <span class="breadcrumb-sep">›</span>
                        <span>Timeline</span>
                    </div>
                    <h1 class="page-title">Case Timeline</h1>
                    <p class="page-subtitle" id="timeline-subtitle">Loading timeline...</p>
                </div>
                <div class="page-actions">
                    <button class="btn btn-ghost btn-sm" id="btn-refresh-timeline">${icons.search} Refresh</button>
                </div>
            </div>

            <!-- Stats -->
            <div class="grid-cols-3" id="timeline-stats" style="margin-bottom: var(--space-6)">
                <div class="stat-card">
                    <div class="stat-icon" style="background: var(--warning-50)">🕐</div>
                    <div class="stat-value" id="stat-days">—</div>
                    <div class="stat-label">Days Since Created</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: var(--primary-50)">📋</div>
                    <div class="stat-value" id="stat-events">—</div>
                    <div class="stat-label">Total Events</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: var(--info-50)">📅</div>
                    <div class="stat-value" id="stat-latest">—</div>
                    <div class="stat-label">Latest Activity</div>
                </div>
            </div>

            <!-- Timeline -->
            <div class="card" id="timeline-container">
                <h3 style="margin-bottom: var(--space-6)">Case Events</h3>
                <div style="text-align: center; padding: var(--space-8)">
                    <div class="spinner spinner-lg" style="margin: 0 auto"></div>
                </div>
            </div>
        </div>
    </div>`;
}

export async function init() {
    document.getElementById('btn-refresh-timeline')?.addEventListener('click', loadTimeline);
    await loadTimeline();
}

function getCaseIdFromUrl() {
    const hash = window.location.hash;
    // Try URL params: #/case-timeline?case=CASE-2026-00001
    const match = hash.match(/[?&]case=([^&]+)/);
    if (match) return decodeURIComponent(match[1]);

    // Try session stored case
    const current = getCurrentCase();
    if (current?.id) return current.id;

    return null;
}

async function loadTimeline() {
    const container = document.getElementById('timeline-container');

    if (!isAuthenticated()) {
        container.innerHTML = `
            <div style="text-align: center; padding: var(--space-10)">
                <div style="font-size: 48px; margin-bottom: var(--space-3)">🔒</div>
                <h3>Please log in</h3>
                <p style="color: var(--text-secondary); margin-top: var(--space-2)">You need to be logged in to view case timelines.</p>
                <button class="btn btn-primary" style="margin-top: var(--space-4)" data-navigate="/login">Log In</button>
            </div>`;
        return;
    }

    const caseId = getCaseIdFromUrl();

    if (!caseId) {
        // Show a case picker since no specific case is in the URL
        container.innerHTML = `
            <h3 style="margin-bottom: var(--space-4)">Select a Case</h3>
            <div id="timeline-case-picker" style="text-align: center; padding: var(--space-4)">
                <div class="spinner spinner-lg" style="margin: 0 auto"></div>
            </div>`;
        await showCasePicker();
        return;
    }

    try {
        // Load case details and timeline in parallel
        const [caseResult, timelineResult] = await Promise.all([
            api.getCase(caseId),
            api.getCaseTimeline(caseId),
        ]);

        caseData = caseResult;
        timelineEvents = timelineResult.timeline || [];

        // Update subtitle
        document.getElementById('timeline-subtitle').textContent =
            `Chronological view of events for ${caseData.title || caseId}${caseData.fir_number ? ` (${caseData.fir_number})` : ''}`;

        // Update stats
        const createdDate = caseData.created_at ? new Date(caseData.created_at) : null;
        const daysSince = createdDate ? Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)) : '—';
        document.getElementById('stat-days').textContent = daysSince.toString();
        document.getElementById('stat-events').textContent = timelineEvents.length.toString();

        if (timelineEvents.length > 0) {
            const latestDate = timelineEvents[0].date || timelineEvents[0].created_at;
            document.getElementById('stat-latest').textContent = formatDateShort(latestDate);
        }

        // Render timeline
        if (timelineEvents.length === 0) {
            container.innerHTML = `
                <h3 style="margin-bottom: var(--space-4)">Case Events</h3>
                <div style="text-align: center; padding: var(--space-8); color: var(--text-secondary)">
                    <div style="font-size: 48px; margin-bottom: var(--space-3)">📅</div>
                    <p>No events recorded for this case yet.</p>
                    <p style="font-size: var(--text-sm)">Events are automatically created when documents are uploaded, evidence is registered, or court proceedings are recorded.</p>
                </div>`;
        } else {
            const formattedEvents = timelineEvents.map(e => ({
                date: formatDate(e.date || e.created_at),
                title: e.title || e.action || 'Event',
                body: e.description || e.details || '',
                status: e.status || 'completed',
            }));

            container.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-6)">
                    <h3>Case Events</h3>
                    <span style="font-size: var(--text-sm); color: var(--text-tertiary)">${timelineEvents.length} event${timelineEvents.length !== 1 ? 's' : ''}</span>
                </div>
                ${timeline(formattedEvents)}`;
        }

    } catch (err) {
        container.innerHTML = `
            <div style="text-align: center; padding: var(--space-8); color: var(--text-secondary)">
                ${icons.danger} Failed to load timeline: ${err.message}
            </div>`;
    }
}

async function showCasePicker() {
    const picker = document.getElementById('timeline-case-picker');
    try {
        const data = await api.listCases({ limit: 20 });
        const cases = data.cases || [];

        if (cases.length === 0) {
            picker.innerHTML = `
                <div style="color: var(--text-secondary); padding: var(--space-4)">
                    No cases found. Create a case first.
                </div>`;
            return;
        }

        picker.innerHTML = `
            <div style="display: grid; gap: var(--space-3); text-align: left">
                ${cases.map(c => `
                    <div class="case-list-item" style="cursor: pointer; padding: var(--space-3); border: 1px solid var(--border); border-radius: var(--radius-md); transition: all 0.15s ease"
                         onclick="window.location.hash='#/case-timeline?case=${encodeURIComponent(c.id)}'">
                        <div style="display: flex; justify-content: space-between; align-items: center">
                            <div>
                                <div style="font-weight: 600">${c.id}</div>
                                <div style="font-size: var(--text-sm); color: var(--text-secondary)">${c.title}</div>
                            </div>
                            <div>${badge(c.status, c.status === 'active' ? 'success' : 'neutral')}</div>
                        </div>
                    </div>
                `).join('')}
            </div>`;
    } catch (err) {
        picker.innerHTML = `<div style="color: var(--text-secondary)">Failed to load cases: ${err.message}</div>`;
    }
}

function formatDate(iso) {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
}

function formatDateShort(iso) {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    } catch { return iso; }
}
