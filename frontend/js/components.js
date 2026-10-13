/**
 * NyaySetu — Reusable UI Component Generators
 * Pure functions that return HTML strings for common UI patterns.
 */
import { getLanguage } from './state.js';
import { t } from './i18n.js';

const RAW_HTML = Symbol('raw-html');

export function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[char]);
}

export function raw(htmlString) {
    return { [RAW_HTML]: true, value: String(htmlString ?? '') };
}

export function cell(value) {
    return escapeHtml(value);
}

function safeClass(value, fallback = 'neutral') {
    const allowed = new Set(['primary', 'secondary', 'neutral', 'success', 'warning', 'danger', 'info', 'error', 'ai']);
    return allowed.has(value) ? value : fallback;
}

function safeColor(value, fallback) {
    const color = String(value || '');
    return /^(var\(--[\w-]+\)|#[\da-f]{3,8}|[a-z]+)$/i.test(color) ? color : fallback;
}

// ===== ICONS (inline SVG for independence from external libraries) ===========

export const icons = {
    scales: '⚖️', gavel: '🔨', shield: '🛡️', search: '🔍', upload: '📤',
    doc: '📄', user: '👤', users: '👥', lawyer: '👨‍⚖️', police: '👮',
    judge: '🏛️', clock: '🕐', calendar: '📅', chart: '📊', lock: '🔒',
    check: '✓', cross: '✕', arrow: '→', chevDown: '▾', chevRight: '▸',
    info: 'ℹ️', warning: '⚠️', danger: '🚫', star: '⭐', bell: '🔔',
    ai: '🤖', bulb: '💡', file: '📁', link: '🔗', phone: '📱',
    mail: '✉️', location: '📍', language: '🌐', menu: '☰', close: '✕',
    home: '🏠', settings: '⚙️', logout: '🚪', plus: '+', minus: '−',
    eye: '👁️', download: '⬇️', share: '↗️', edit: '✏️', trash: '🗑️',
    verified: '✅', pending: '⏳', flag: '🚩', bookmark: '📌',
    briefcase: '💼', graduate: '🎓', handshake: '🤝',
};

// ===== NAVBAR ================================================================

export function navbar(options = {}) {
    const { transparent = false, showLinks = true, showRole = false, roleName = '' } = options;
    const language = getLanguage();
    return `
    <nav class="navbar ${transparent ? 'navbar-transparent' : ''}" id="main-navbar">
        <button class="menu-toggle" id="menu-toggle">${icons.menu}</button>
        <a class="logo" data-navigate="/">
            <span class="logo-icon">${icons.scales}</span>
            <span class="logo-text">NYAYSETU</span>
        </a>
        ${showLinks ? `
        <div class="nav-links" id="nav-links">
            <a class="nav-link" data-navigate="/">${t('Home', language)}</a>
            <a class="nav-link" data-scroll="how-it-works">How It Works</a>
            <a class="nav-link" data-scroll="features">${t('Features', language)}</a>
            <a class="nav-link" data-navigate="/legal-provisions">${t('Legal Database', language)}</a>
            <a class="nav-link" data-navigate="/case-law-search">${t('Case Law', language)}</a>
        </div>` : ''}
        <div class="nav-actions">
            <select class="lang-selector" id="lang-selector" aria-label="Language">
                <option value="en">English</option>
                <option value="hi">हिन्दी</option>
                <option value="mr">मराठी</option>
            </select>
            ${showRole ? `
                <span class="badge badge-primary badge-lg">${escapeHtml(roleName)}</span>
                <button class="btn btn-ghost btn-sm" data-navigate="/notifications" title="${t('Notifications', language)}">${icons.bell}</button>
                <button class="btn btn-ghost btn-sm" id="logout-btn" title="${t('Switch Role', language)}">${icons.logout}</button>
            ` : `
                <button class="btn btn-secondary btn-sm" data-navigate="/login">${t('Login', language)}</button>
                <button class="btn btn-primary btn-sm" data-navigate="/login">${t('Get Started', language)}</button>
            `}
        </div>
    </nav>`;
}

// ===== SIDEBAR ===============================================================

export function sidebar(items = [], activeId = '') {
    const groupedItems = {};
    items.forEach(item => {
        const group = item.group || 'Main';
        if (!groupedItems[group]) groupedItems[group] = [];
        groupedItems[group].push(item);
    });

    let html = '<aside class="sidebar" id="sidebar">';
    for (const [group, groupItems] of Object.entries(groupedItems)) {
        html += `<div class="sidebar-label">${escapeHtml(group)}</div>`;
        for (const item of groupItems) {
            const isActive = item.id === activeId;
            html += `
            <div class="sidebar-item ${isActive ? 'active' : ''}" 
                 data-navigate="${escapeHtml(item.route || '#')}"
                 data-sidebar-id="${escapeHtml(item.id)}">
                <span class="sidebar-icon">${escapeHtml(item.icon || '')}</span>
                <span>${escapeHtml(item.label)}</span>
                ${item.badge ? `<span class="sidebar-badge">${escapeHtml(item.badge)}</span>` : ''}
            </div>`;
        }
    }
    html += '</aside><div class="sidebar-overlay" id="sidebar-overlay"></div>';
    return html;
}

// ===== STAT CARD =============================================================

export function statCard({ icon, iconBg, value, label, change, changeType }) {
    const background = safeColor(iconBg, 'var(--primary-50)');
    return `
    <div class="stat-card">
        <div class="stat-icon" style="background: ${background}; color: ${iconBg ? 'white' : 'var(--primary-600)'}">
            ${escapeHtml(icon)}
        </div>
        <div class="stat-value">${escapeHtml(value)}</div>
        <div class="stat-label">${escapeHtml(label)}</div>
        ${change ? `
        <div class="stat-change" style="color: ${changeType === 'up' ? 'var(--success-600)' : changeType === 'down' ? 'var(--danger-600)' : 'var(--text-tertiary)'}">
            ${changeType === 'up' ? '↑' : changeType === 'down' ? '↓' : '•'} ${escapeHtml(change)}
        </div>` : ''}
    </div>`;
}

// ===== BADGE =================================================================

export function badge(text, type = 'neutral') {
    return `<span class="badge badge-${safeClass(type)}">${escapeHtml(text)}</span>`;
}

export function badgeDot(text, type = 'neutral') {
    return `<span class="badge badge-${safeClass(type)} badge-dot">${escapeHtml(text)}</span>`;
}

// ===== AI BADGE ==============================================================

export function aiBadge() {
    return `
    <span class="ai-badge">
        <span class="ai-icon">${icons.ai}</span>
        AI-Assisted
        <span class="ai-tooltip">
            Automated tools extract selectable PDF text, search reference judgments and surface rule-based review prompts.
            They do not verify facts or make legal conclusions. Check results against current law and official records.
            This is not legal advice.
        </span>
    </span>`;
}

// ===== FEATURE CARD ==========================================================

export function featureCard({ icon, iconBg, title, description, route }) {
    const background = safeColor(iconBg, 'var(--primary-50)');
    return `
    <div class="feature-card" data-navigate="${escapeHtml(route || '#')}">
        <div class="feature-icon" style="background: ${background}; color: ${iconBg ? '' : 'var(--primary-600)'}">
            ${escapeHtml(icon)}
        </div>
        <div class="feature-title">${escapeHtml(title)}</div>
        <div class="feature-description">${escapeHtml(description)}</div>
    </div>`;
}

// ===== DATA TABLE ============================================================

/**
 * Custom render callbacks return trusted HTML, and must escape dynamic values
 * with cell() or use an escaping component such as badge(). Default cells are
 * escaped automatically.
 */
export function dataTable({ columns, rows, emptyText = 'No data available' }) {
    if (!rows || rows.length === 0) {
        return `<div class="empty-state"><div class="empty-icon">${icons.doc}</div>
            <div class="empty-title">${escapeHtml(emptyText)}</div></div>`;
    }
    let html = '<div style="overflow-x: auto"><table class="data-table"><thead><tr>';
    columns.forEach(col => {
        html += `<th>${escapeHtml(col.label)}</th>`;
    });
    html += '</tr></thead><tbody>';
    rows.forEach(row => {
        html += '<tr>';
        columns.forEach(col => {
            const rendered = col.render ? col.render(row) : (row[col.key] ?? '—');
            const val = rendered && rendered[RAW_HTML] ? rendered.value : escapeHtml(rendered);
            html += `<td>${val}</td>`;
        });
        html += '</tr>';
    });
    html += '</tbody></table></div>';
    return html;
}

// ===== ACCORDION =============================================================

/**
 * Accordion titles and contents are trusted HTML. Escape any dynamic values
 * before inserting them into either field.
 */
export function accordion(items) {
    return items.map((item, i) => `
    <div class="accordion-item" id="acc-${i}">
        <button class="accordion-header" type="button" data-accordion-toggle>
            <span>${item.title}</span>
            <span class="accordion-arrow">▾</span>
        </button>
        <div class="accordion-body">${item.content}</div>
    </div>`).join('');
}

// ===== TIMELINE ==============================================================

export function timeline(events) {
    return `<div class="timeline">${events.map(e => `
        <div class="timeline-item ${escapeHtml(e.status || '')}">
            <div class="timeline-dot"></div>
            <div class="timeline-date">${escapeHtml(e.date)}</div>
            <div class="timeline-title">${escapeHtml(e.title)}</div>
            ${e.body ? `<div class="timeline-body">${escapeHtml(e.body)}</div>` : ''}
        </div>`).join('')}</div>`;
}

// ===== UPLOAD ZONE ===========================================================

export function uploadZone(id = 'file-upload') {
    const safeId = String(id).replace(/[^A-Za-z0-9_-]/g, '') || 'file-upload';
    return `
    <div class="upload-zone" id="${safeId}-zone">
        <div class="upload-icon">${icons.upload}</div>
        <div class="upload-title">Extract text from a PDF</div>
        <div class="upload-hint">Text-based PDFs only · 10 MB maximum · scanned PDFs need OCR</div>
        <div class="upload-formats">
            ${badge('PDF', 'neutral')} ${badge('Not added to case library', 'info')}
        </div>
        <input type="file" id="${safeId}" accept=".pdf,application/pdf" style="display:none">
    </div>`;
}

// ===== ALERT =================================================================

/**
 * The message argument is trusted HTML for existing static rich-text callers.
 * Escape API- or user-provided content before passing it as message.
 */
export function alert(message, type = 'info', title = '') {
    const alertType = safeClass(type, 'info');
    const iconMap = { info: icons.info, success: icons.check, warning: icons.warning, danger: icons.danger, ai: icons.ai };
    return `
    <div class="alert alert-${alertType}">
        <span class="alert-icon">${iconMap[alertType] || icons.info}</span>
        <div class="alert-content">
            ${title ? `<div class="alert-title">${escapeHtml(title)}</div>` : ''}
            <div>${message}</div>
        </div>
    </div>`;
}

// ===== DISCLAIMER ============================================================

export function disclaimer(text) {
    return `
    <div class="alert alert-disclaimer">
        <span class="alert-icon">${icons.warning}</span>
    <div class="alert-content">${escapeHtml(text || 'AI-generated information is for assistance and must be verified against applicable law and official court records. This is not legal advice.')}</div>
    </div>`;
}

// ===== STEP PROGRESS =========================================================

export function stepProgress(steps, currentStep = 0) {
    return `<div class="step-progress">${steps.map((step, i) => `
        <div class="step-item ${i < currentStep ? 'completed' : i === currentStep ? 'active' : ''}">
            <div class="step-dot">${i < currentStep ? '✓' : i + 1}</div>
            <div class="step-label">${escapeHtml(step)}</div>
        </div>`).join('')}</div>`;
}

// ===== MODAL =================================================================

export function showModal(title, content, actions = '') {
    const modal = document.getElementById('modal-root');
    modal.innerHTML = `
    <div class="modal-overlay" id="modal-overlay">
        <div class="modal">
            <div class="modal-header">
                <h3 class="modal-title">${escapeHtml(title)}</h3>
                <button class="modal-close" id="modal-close">${icons.close}</button>
            </div>
            <div class="modal-body">${content}</div>
            ${actions ? `<div class="modal-footer">${actions}</div>` : ''}
        </div>
    </div>`;
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-overlay').addEventListener('click', e => {
        if (e.target === e.currentTarget) closeModal();
    });
}

export function closeModal() {
    document.getElementById('modal-root').innerHTML = '';
}

// ===== TOAST =================================================================

export function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${safeClass(type, 'info')}`;
    const iconMap = { info: icons.info, success: '✅', warning: icons.warning, error: '❌', danger: '❌' };
    const toastType = safeClass(type, 'info');
    toast.innerHTML = `
        <span>${iconMap[toastType] || icons.info}</span>
        <div style="flex:1"><div style="font-weight:500;font-size:13px">${escapeHtml(message)}</div></div>
        <button class="btn btn-ghost btn-sm" data-dismiss-toast>${icons.close}</button>`;
    toast.querySelector('[data-dismiss-toast]').addEventListener('click', () => toast.remove());
    container.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
}

// ===== LOADING OVERLAY =======================================================

export function loadingOverlay(message = 'Loading...') {
    return `
    <div class="loading-overlay">
        <div class="spinner spinner-lg"></div>
        <div>${escapeHtml(message)}</div>
    </div>`;
}

// ===== DOCUMENT CARD =========================================================

export function docCard({ name, type, date, uploadedBy, status }) {
    const typeClass = ['PDF', 'IMG'].includes(type) ? type.toLowerCase() : 'doc';
    const typeIcon = type === 'PDF' ? '📕' : type === 'IMG' ? '🖼️' : '📄';
    return `
    <div class="doc-card">
        <div class="doc-icon ${typeClass}">${typeIcon}</div>
        <div class="doc-info">
            <div class="doc-name">${escapeHtml(name)}</div>
            <div class="doc-meta">${escapeHtml(date)} • ${escapeHtml(uploadedBy || 'Unknown')}</div>
        </div>
        <div class="doc-actions">
            ${badge(status || 'Uploaded', status === 'Verified' ? 'success' : 'neutral')}
            <button class="btn btn-ghost btn-sm">${icons.eye}</button>
            <button class="btn btn-ghost btn-sm">${icons.download}</button>
        </div>
    </div>`;
}

// ===== CASE CARD =============================================================

export function caseCard({ title, court, date, bailType, outcome, sections, similarity }) {
    const outcomeType = outcome === 'Granted' ? 'success' : outcome === 'Rejected' ? 'danger' : 'warning';
    return `
    <div class="case-card">
        <div class="card-title" style="font-size: var(--text-base)">${escapeHtml(title)}</div>
        <div class="card-subtitle">${escapeHtml(court)} • ${escapeHtml(date)}</div>
        <div class="case-meta">
            ${badge(bailType || 'Regular', 'primary')}
            ${badge(outcome || 'Pending', outcomeType)}
            ${sections ? badge(sections, 'neutral') : ''}
            ${similarity ? `<span class="badge badge-info">Similarity: ${escapeHtml(similarity)}</span>` : ''}
        </div>
    </div>`;
}

// ===== PROVISION CARD ========================================================

export function provisionCard(prov) {
    const bailType = prov.bailable === 'bailable' ? 'success' : prov.bailable === 'non-bailable' ? 'danger' : 'warning';
    return `
    <div class="card">
        <div class="card-header">
            <div>
                <div class="card-title">${escapeHtml(prov.offense_name || prov.offence || '—')}</div>
                <div class="card-subtitle">
                    ${prov.ipc_section ? `IPC §${escapeHtml(prov.ipc_section)}` : ''}
                    ${prov.bns_section ? ` / BNS §${escapeHtml(prov.bns_section)}` : ''}
                    ${prov.act_name ? `${escapeHtml(prov.act_name)} §${escapeHtml(prov.section)}` : ''}
                </div>
            </div>
            ${badge(prov.bailable || 'Unknown', bailType)}
        </div>
        <div class="card-body">
            <div style="display:flex; gap: var(--space-2); flex-wrap: wrap; margin-bottom: var(--space-3)">
                ${prov.cognizable ? badge(prov.cognizable, 'neutral') : ''}
                ${prov.compoundable ? badge(prov.compoundable, 'neutral') : ''}
                ${prov.category ? badge(prov.category, 'info') : ''}
            </div>
            <div style="font-size: var(--text-sm); color: var(--text-secondary)">
                ${prov.min_punishment_years != null || prov.max_punishment_years != null ? 
                    `<strong>Punishment:</strong> ${escapeHtml(prov.min_punishment_years || 0)}–${escapeHtml(prov.max_punishment_years || '—')} years` : ''}
                ${prov.death_or_life ? ' • <span class="text-danger">Death/Life imprisonment possible</span>' : ''}
                ${prov.fine_applicable ? ' • Fine applicable' : ''}
            </div>
            ${prov.notes ? `<div style="font-size: var(--text-xs); color: var(--text-tertiary); margin-top: var(--space-2)">${escapeHtml(prov.notes)}</div>` : ''}
            ${prov.triable_by ? `<div style="font-size: var(--text-xs); color: var(--text-tertiary); margin-top: var(--space-1)">Triable by: ${escapeHtml(prov.triable_by)}</div>` : ''}
        </div>
    </div>`;
}

// ===== JUDGMENT CARD =========================================================

export function judgmentCard(j) {
    return `
    <div class="card">
        <div class="card-header">
            <div>
                <div class="card-title">${escapeHtml(j.case_name || j.case_title || '—')}</div>
                <div class="card-subtitle">${escapeHtml(j.court || '')} ${j.year ? `(${escapeHtml(j.year)})` : ''} ${j.citation ? `• ${escapeHtml(j.citation)}` : ''}</div>
            </div>
            ${j.bail_outcome ? badge(j.bail_outcome, j.bail_outcome === 'Granted' ? 'success' : 'danger') : ''}
        </div>
        <div class="card-body">
            <p>${escapeHtml(j.principle_summary || j.summary || j.judgment_reason || '')}</p>
            ${j.applicable_categories ? `
            <div style="margin-top: var(--space-3); display: flex; gap: var(--space-2); flex-wrap: wrap">
                ${j.applicable_categories.split(',').map(c => badge(c.trim(), 'info')).join('')}
            </div>` : ''}
            ${j.ipc_sections ? `<div style="margin-top: var(--space-2); font-size: var(--text-xs); color: var(--text-tertiary)">Sections: ${escapeHtml(j.ipc_sections)}</div>` : ''}
            ${j.similarity != null ? `<div style="margin-top: var(--space-2)">${badge('Similarity: ' + j.similarity, 'primary')}</div>` : ''}
        </div>
        ${j.bail_type || j.date ? `
        <div class="card-footer" style="font-size: var(--text-xs); color: var(--text-tertiary)">
            <span>${escapeHtml(j.bail_type || '')} ${j.date ? `• ${escapeHtml(j.date)}` : ''}</span>
            ${aiBadge()}
        </div>` : ''}
    </div>`;
}
