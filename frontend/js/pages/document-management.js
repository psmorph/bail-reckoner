/**
 * Bail Reckoner — Document Management Page
 */
import { navbar, icons, badge, docCard } from '../components.js';
import { getRole } from '../state.js';
import { sampleDocuments } from '../data.js';

export function render() {
    const role = getRole();
    const roleName = localStorage.getItem('br_role_name') || 'User';
    const categories = [...new Set(sampleDocuments.map(d => d.category))];

    return `
    <div class="layout-app">
        ${navbar({ showLinks: false, showRole: true, roleName })}
        <div class="page-content animate-fade-in">
            <div class="page-header">
                <div>
                    <h1 class="page-title">Document Management</h1>
                    <p class="page-subtitle">Secure document vault for case FIR/2025/DL/004521</p>
                </div>
                <div class="page-actions">
                    <button class="btn btn-primary btn-sm" data-navigate="/case-upload">${icons.upload} Upload Document</button>
                </div>
            </div>

            <!-- Category Tabs -->
            <div class="tabs" style="margin-bottom: var(--space-6)">
                <div class="tab active" data-filter="all">All Documents</div>
                ${categories.map(c => `<div class="tab" data-filter="${c}">${c}</div>`).join('')}
            </div>

            <!-- Document List -->
            <div id="doc-list" style="display: grid; gap: var(--space-3)">
                ${sampleDocuments.map(d => docCard(d)).join('')}
            </div>
        </div>
    </div>`;
}

export function init() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const filter = tab.dataset.filter;
            const docs = filter === 'all' ? sampleDocuments : sampleDocuments.filter(d => d.category === filter);
            document.getElementById('doc-list').innerHTML = docs.map(d => docCard(d)).join('');
        });
    });
}
