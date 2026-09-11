/**
 * Bail Reckoner — Legal Provisions Search Page
 */
import { navbar, icons, badge, provisionCard, aiBadge, disclaimer, showToast } from '../components.js';
import { getRole } from '../state.js';
import * as api from '../api.js';

export function render() {
    const role = getRole();
    const roleName = localStorage.getItem('br_role_name') || 'User';
    return `
    <div class="layout-app">
        ${navbar({ showLinks: false, showRole: true, roleName })}
        <div class="page-content animate-fade-in">
            <div class="page-header">
                <div>
                    <h1 class="page-title">Legal Provisions Database</h1>
                    <p class="page-subtitle">Search IPC/BNS offences, special statutes, punishments, and bail classifications.</p>
                </div>
            </div>

            <!-- Search & Filters -->
            <div class="card" style="margin-bottom: var(--space-6)">
                <div class="search-bar" style="max-width: 100%; margin-bottom: var(--space-4)">
                    <span class="search-icon">${icons.search}</span>
                    <input type="text" class="form-input" id="prov-search" placeholder="Search Act, Section, Offence or Keyword...">
                </div>
                <div class="filter-bar" style="border: none; padding: 0">
                    <select class="form-select" id="prov-category" style="min-width: 150px">
                        <option value="">All Categories</option>
                    </select>
                    <select class="form-select" id="prov-bailable" style="min-width: 150px">
                        <option value="">All Bail Status</option>
                        <option value="bailable">Bailable</option>
                        <option value="non-bailable">Non-Bailable</option>
                    </select>
                    <select class="form-select" id="prov-act" style="min-width: 200px">
                        <option value="">All Acts</option>
                    </select>
                    <button class="btn btn-primary" id="prov-search-btn">${icons.search} Search</button>
                </div>
            </div>

            <!-- Results -->
            <div id="prov-results">
                <div class="loading-overlay">
                    <div class="spinner spinner-lg"></div>
                    <div>Loading provisions...</div>
                </div>
            </div>
        </div>
    </div>`;
}

export async function init() {
    // Load filter options
    try {
        const { categories, acts } = await api.getProvisionCategories();
        const catSelect = document.getElementById('prov-category');
        categories.forEach(c => {
            catSelect.innerHTML += `<option value="${c}">${c.charAt(0).toUpperCase() + c.slice(1)}</option>`;
        });
        const actSelect = document.getElementById('prov-act');
        acts.forEach(a => {
            actSelect.innerHTML += `<option value="${a}">${a}</option>`;
        });
    } catch (e) { /* ignore */ }

    // Initial load
    await searchProvisions();

    // Search handlers
    document.getElementById('prov-search-btn')?.addEventListener('click', searchProvisions);
    document.getElementById('prov-search')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') searchProvisions();
    });
}

async function searchProvisions() {
    const search = document.getElementById('prov-search')?.value || '';
    const category = document.getElementById('prov-category')?.value || '';
    const bailable = document.getElementById('prov-bailable')?.value || '';
    const act = document.getElementById('prov-act')?.value || '';

    const container = document.getElementById('prov-results');
    container.innerHTML = '<div class="loading-overlay"><div class="spinner spinner-lg"></div><div>Searching provisions...</div></div>';

    try {
        const { provisions, count } = await api.getProvisions({ search, category, bailable, act });
        if (provisions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">${icons.search}</div>
                    <div class="empty-title">No provisions found</div>
                    <div class="empty-description">Try different search terms or adjust your filters.</div>
                </div>`;
            return;
        }

        container.innerHTML = `
            <div style="margin-bottom: var(--space-4); font-size: var(--text-sm); color: var(--text-secondary)">
                Found <strong>${count}</strong> provision${count !== 1 ? 's' : ''}
            </div>
            <div style="display: grid; gap: var(--space-4)">
                ${provisions.map(p => provisionCard(p)).join('')}
            </div>`;
    } catch (e) {
        container.innerHTML = `<div class="alert alert-danger">${icons.danger} Failed to load provisions: ${e.message}</div>`;
    }
}
