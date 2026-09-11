/**
 * Bail Reckoner — Reusable UI Component Generators
 * Pure functions that return HTML strings for common UI patterns.
 */

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
    return `
    <nav class="navbar ${transparent ? 'navbar-transparent' : ''}" id="main-navbar">
        <button class="menu-toggle" id="menu-toggle">${icons.menu}</button>
        <a class="logo" data-navigate="/">
            <span class="logo-icon">${icons.scales}</span>
            <span class="logo-text">BAIL RECKONER</span>
        </a>
        ${showLinks ? `
        <div class="nav-links" id="nav-links">
            <a class="nav-link" data-navigate="/">Home</a>
            <a class="nav-link" data-scroll="how-it-works">How It Works</a>
            <a class="nav-link" data-scroll="features">Features</a>
            <a class="nav-link" data-navigate="/legal-provisions">Legal Database</a>
            <a class="nav-link" data-navigate="/case-law-search">Case Law</a>
        </div>` : ''}
        <div class="nav-actions">
            <select class="lang-selector" id="lang-selector" aria-label="Language">
                <option value="en">English</option>
                <option value="hi">हिन्दी</option>
                <option value="mr">मराठी</option>
            </select>
            ${showRole ? `
                <span class="badge badge-primary badge-lg">${roleName}</span>
                <button class="btn btn-ghost btn-sm" data-navigate="/notifications" title="Notifications">${icons.bell}</button>
                <button class="btn btn-ghost btn-sm" id="logout-btn" title="Switch Role">${icons.logout}</button>
            ` : `
                <button class="btn btn-secondary btn-sm" data-navigate="/login">Login</button>
                <button class="btn btn-primary btn-sm" data-navigate="/login">Get Started</button>
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
        html += `<div class="sidebar-label">${group}</div>`;
        for (const item of groupItems) {
            const isActive = item.id === activeId;
            html += `
            <div class="sidebar-item ${isActive ? 'active' : ''}" 
                 data-navigate="${item.route || '#'}"
                 data-sidebar-id="${item.id}">
                <span class="sidebar-icon">${item.icon || ''}</span>
                <span>${item.label}</span>
                ${item.badge ? `<span class="sidebar-badge">${item.badge}</span>` : ''}
            </div>`;
        }
    }
    html += '</aside><div class="sidebar-overlay" id="sidebar-overlay"></div>';
    return html;
}

// ===== STAT CARD =============================================================

export function statCard({ icon, iconBg, value, label, change, changeType }) {
    return `
    <div class="stat-card">
        <div class="stat-icon" style="background: ${iconBg || 'var(--primary-50)'}; color: ${iconBg ? 'white' : 'var(--primary-600)'}">
            ${icon}
        </div>
        <div class="stat-value">${value}</div>
        <div class="stat-label">${label}</div>
        ${change ? `
        <div class="stat-change" style="color: ${changeType === 'up' ? 'var(--success-600)' : changeType === 'down' ? 'var(--danger-600)' : 'var(--text-tertiary)'}">
            ${changeType === 'up' ? '↑' : changeType === 'down' ? '↓' : '•'} ${change}
        </div>` : ''}
    </div>`;
}

// ===== BADGE =================================================================

export function badge(text, type = 'neutral') {
    return `<span class="badge badge-${type}">${text}</span>`;
}

export function badgeDot(text, type = 'neutral') {
    return `<span class="badge badge-${type} badge-dot">${text}</span>`;
}

// ===== AI BADGE ==============================================================

export function aiBadge() {
    return `
    <span class="ai-badge">
        <span class="ai-icon">${icons.ai}</span>
        AI-Assisted
        <span class="ai-tooltip">
            AI assists with document extraction, summarization and information retrieval. 
            Legal conclusions should be verified against applicable law and official records. 
            This is not legal advice.
        </span>
    </span>`;
}

// ===== FEATURE CARD ==========================================================

export function featureCard({ icon, iconBg, title, description, route }) {
    return `
    <div class="feature-card" data-navigate="${route || '#'}">
        <div class="feature-icon" style="background: ${iconBg || 'var(--primary-50)'}; color: ${iconBg ? '' : 'var(--primary-600)'}">
            ${icon}
        </div>
        <div class="feature-title">${title}</div>
        <div class="feature-description">${description}</div>
    </div>`;
}

// ===== DATA TABLE ============================================================

export function dataTable({ columns, rows, emptyText = 'No data available' }) {
    if (!rows || rows.length === 0) {
        return `<div class="empty-state"><div class="empty-icon">${icons.doc}</div>
            <div class="empty-title">${emptyText}</div></div>`;
    }
    let html = '<div style="overflow-x: auto"><table class="data-table"><thead><tr>';
    columns.forEach(col => {
        html += `<th>${col.label}</th>`;
    });
    html += '</tr></thead><tbody>';
    rows.forEach(row => {
        html += '<tr>';
        columns.forEach(col => {
            const val = col.render ? col.render(row) : (row[col.key] ?? '—');
            html += `<td>${val}</td>`;
        });
        html += '</tr>';
    });
    html += '</tbody></table></div>';
    return html;
}

// ===== ACCORDION =============================================================

export function accordion(items) {
    return items.map((item, i) => `
    <div class="accordion-item" id="acc-${i}">
        <div class="accordion-header" onclick="
            this.parentElement.classList.toggle('open');
        ">
            <span>${item.title}</span>
            <span class="accordion-arrow">▾</span>
        </div>
        <div class="accordion-body">${item.content}</div>
    </div>`).join('');
}

// ===== TIMELINE ==============================================================

export function timeline(events) {
    return `<div class="timeline">${events.map(e => `
        <div class="timeline-item ${e.status || ''}">
            <div class="timeline-dot"></div>
            <div class="timeline-date">${e.date}</div>
            <div class="timeline-title">${e.title}</div>
            ${e.body ? `<div class="timeline-body">${e.body}</div>` : ''}
        </div>`).join('')}</div>`;
}

// ===== UPLOAD ZONE ===========================================================

export function uploadZone(id = 'file-upload') {
    return `
    <div class="upload-zone" id="${id}-zone">
        <div class="upload-icon">${icons.upload}</div>
        <div class="upload-title">Upload FIR / Charge Sheet / Court Order</div>
        <div class="upload-hint">Drag and drop your document here, or click to browse</div>
        <div class="upload-formats">
            ${badge('PDF', 'neutral')} ${badge('JPG', 'neutral')} ${badge('PNG', 'neutral')}
        </div>
        <input type="file" id="${id}" accept=".pdf,.jpg,.jpeg,.png" style="display:none">
    </div>`;
}

// ===== ALERT =================================================================

export function alert(message, type = 'info', title = '') {
    const iconMap = { info: icons.info, success: icons.check, warning: icons.warning, danger: icons.danger, ai: icons.ai };
    return `
    <div class="alert alert-${type}">
        <span class="alert-icon">${iconMap[type] || icons.info}</span>
        <div class="alert-content">
            ${title ? `<div class="alert-title">${title}</div>` : ''}
            <div>${message}</div>
        </div>
    </div>`;
}

// ===== DISCLAIMER ============================================================

export function disclaimer(text) {
    return `
    <div class="alert alert-disclaimer">
        <span class="alert-icon">${icons.warning}</span>
        <div class="alert-content">${text || 'AI-generated information is for assistance and must be verified against applicable law and official court records. This is not legal advice.'}</div>
    </div>`;
}

// ===== STEP PROGRESS =========================================================

export function stepProgress(steps, currentStep = 0) {
    return `<div class="step-progress">${steps.map((step, i) => `
        <div class="step-item ${i < currentStep ? 'completed' : i === currentStep ? 'active' : ''}">
            <div class="step-dot">${i < currentStep ? '✓' : i + 1}</div>
            <div class="step-label">${step}</div>
        </div>`).join('')}</div>`;
}

// ===== MODAL =================================================================

export function showModal(title, content, actions = '') {
    const modal = document.getElementById('modal-root');
    modal.innerHTML = `
    <div class="modal-overlay" id="modal-overlay">
        <div class="modal">
            <div class="modal-header">
                <h3 class="modal-title">${title}</h3>
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
    toast.className = `toast toast-${type}`;
    const iconMap = { info: icons.info, success: '✅', warning: icons.warning, error: '❌' };
    toast.innerHTML = `
        <span>${iconMap[type] || icons.info}</span>
        <div style="flex:1"><div style="font-weight:500;font-size:13px">${message}</div></div>
        <button class="btn btn-ghost btn-sm" onclick="this.parentElement.remove()">${icons.close}</button>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
}

// ===== LOADING OVERLAY =======================================================

export function loadingOverlay(message = 'Loading...') {
    return `
    <div class="loading-overlay">
        <div class="spinner spinner-lg"></div>
        <div>${message}</div>
    </div>`;
}

// ===== DOCUMENT CARD =========================================================

export function docCard({ name, type, date, uploadedBy, status }) {
    const typeClass = type === 'PDF' ? 'pdf' : type === 'IMG' ? 'img' : 'doc';
    const typeIcon = type === 'PDF' ? '📕' : type === 'IMG' ? '🖼️' : '📄';
    return `
    <div class="doc-card">
        <div class="doc-icon ${typeClass}">${typeIcon}</div>
        <div class="doc-info">
            <div class="doc-name">${name}</div>
            <div class="doc-meta">${date} • ${uploadedBy || 'Unknown'}</div>
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
        <div class="card-title" style="font-size: var(--text-base)">${title}</div>
        <div class="card-subtitle">${court} • ${date}</div>
        <div class="case-meta">
            ${badge(bailType || 'Regular', 'primary')}
            ${badge(outcome || 'Pending', outcomeType)}
            ${sections ? badge(sections, 'neutral') : ''}
            ${similarity ? `<span class="badge badge-info">Similarity: ${similarity}</span>` : ''}
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
                <div class="card-title">${prov.offense_name || prov.offence || '—'}</div>
                <div class="card-subtitle">
                    ${prov.ipc_section ? `IPC §${prov.ipc_section}` : ''}
                    ${prov.bns_section ? ` / BNS §${prov.bns_section}` : ''}
                    ${prov.act_name ? `${prov.act_name} §${prov.section}` : ''}
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
                    `<strong>Punishment:</strong> ${prov.min_punishment_years || 0}–${prov.max_punishment_years || '—'} years` : ''}
                ${prov.death_or_life ? ' • <span class="text-danger">Death/Life imprisonment possible</span>' : ''}
                ${prov.fine_applicable ? ' • Fine applicable' : ''}
            </div>
            ${prov.notes ? `<div style="font-size: var(--text-xs); color: var(--text-tertiary); margin-top: var(--space-2)">${prov.notes}</div>` : ''}
            ${prov.triable_by ? `<div style="font-size: var(--text-xs); color: var(--text-tertiary); margin-top: var(--space-1)">Triable by: ${prov.triable_by}</div>` : ''}
        </div>
    </div>`;
}

// ===== JUDGMENT CARD =========================================================

export function judgmentCard(j) {
    return `
    <div class="card">
        <div class="card-header">
            <div>
                <div class="card-title">${j.case_name || j.case_title || '—'}</div>
                <div class="card-subtitle">${j.court || ''} ${j.year ? `(${j.year})` : ''} ${j.citation ? `• ${j.citation}` : ''}</div>
            </div>
            ${j.bail_outcome ? badge(j.bail_outcome, j.bail_outcome === 'Granted' ? 'success' : 'danger') : ''}
        </div>
        <div class="card-body">
            <p>${j.principle_summary || j.summary || j.judgment_reason || ''}</p>
            ${j.applicable_categories ? `
            <div style="margin-top: var(--space-3); display: flex; gap: var(--space-2); flex-wrap: wrap">
                ${j.applicable_categories.split(',').map(c => badge(c.trim(), 'info')).join('')}
            </div>` : ''}
            ${j.ipc_sections ? `<div style="margin-top: var(--space-2); font-size: var(--text-xs); color: var(--text-tertiary)">Sections: ${j.ipc_sections}</div>` : ''}
            ${j.similarity != null ? `<div style="margin-top: var(--space-2)">${badge('Similarity: ' + j.similarity, 'primary')}</div>` : ''}
        </div>
        ${j.bail_type || j.date ? `
        <div class="card-footer" style="font-size: var(--text-xs); color: var(--text-tertiary)">
            <span>${j.bail_type || ''} ${j.date ? `• ${j.date}` : ''}</span>
            ${aiBadge()}
        </div>` : ''}
    </div>`;
}
