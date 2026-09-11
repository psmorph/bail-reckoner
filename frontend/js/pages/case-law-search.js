/**
 * Bail Reckoner — Case Law / Judgment Search Page
 */
import { navbar, icons, badge, aiBadge, judgmentCard, disclaimer, showToast } from '../components.js';
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
                    <h1 class="page-title">Case Law & Judgment Search</h1>
                    <p class="page-subtitle">Search judgments, cases, and legal principles with AI-powered semantic search.</p>
                </div>
                ${aiBadge()}
            </div>

            ${disclaimer('AI-assisted summary — verify against the original judgment. Search results are based on semantic similarity and may not capture all relevant nuances.')}

            <!-- Search -->
            <div class="card" style="margin-top: var(--space-4); margin-bottom: var(--space-6)">
                <div class="search-bar" style="max-width: 100%; margin-bottom: var(--space-4)">
                    <span class="search-icon">${icons.search}</span>
                    <input type="text" class="form-input" id="cl-search" placeholder="Search judgments, cases, or legal principles..." value="prolonged custody and delayed trial">
                </div>
                <div class="filter-bar" style="border: none; padding: 0">
                    <div class="form-group" style="flex: 1; min-width: 150px">
                        <input type="text" class="form-input" id="cl-court" placeholder="Court filter">
                    </div>
                    <div class="form-group" style="flex: 1; min-width: 150px">
                        <input type="text" class="form-input" id="cl-sections" placeholder="IPC/BNS section">
                    </div>
                    <select class="form-select" id="cl-bail-type">
                        <option value="All">All Bail Types</option>
                        <option value="Regular">Regular</option>
                        <option value="Anticipatory">Anticipatory</option>
                        <option value="Interim">Interim</option>
                    </select>
                    <select class="form-select" id="cl-outcome">
                        <option value="All">All Outcomes</option>
                        <option value="Granted">Granted</option>
                        <option value="Rejected">Rejected</option>
                    </select>
                    <div class="form-group" style="min-width: 100px">
                        <input type="text" class="form-input" id="cl-year" placeholder="Year">
                    </div>
                    <button class="btn btn-primary" id="cl-search-btn">${icons.search} Search</button>
                </div>
            </div>

            <!-- Landmark Judgments Section -->
            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">Landmark Judgments on Bail</h3>
                    <button class="btn btn-ghost btn-sm" id="toggle-landmarks">Show / Hide</button>
                </div>
                <div id="landmark-results">
                    <div class="loading-overlay" style="padding: var(--space-4)">
                        <div class="spinner"></div>
                        <span>Loading landmark judgments...</span>
                    </div>
                </div>
            </div>

            <!-- Search Results -->
            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">Search Results</h3>
                    ${aiBadge()}
                </div>
                <div id="cl-results">
                    <div style="text-align: center; padding: var(--space-8); color: var(--text-secondary)">
                        Enter a search query and click Search to find relevant judgments.
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}

export async function init() {
    // Load landmark judgments
    try {
        const { judgments } = await api.getLandmarkJudgments();
        const container = document.getElementById('landmark-results');
        if (judgments && judgments.length > 0) {
            container.innerHTML = `<div style="display: grid; gap: var(--space-4)">
                ${judgments.map(j => judgmentCard(j)).join('')}
            </div>`;
        } else {
            container.innerHTML = '<p style="color: var(--text-secondary); padding: var(--space-4)">No landmark judgments in database.</p>';
        }
    } catch (e) {
        document.getElementById('landmark-results').innerHTML = '<p style="color: var(--text-secondary)">Unable to load landmark judgments.</p>';
    }

    // Toggle landmarks
    document.getElementById('toggle-landmarks')?.addEventListener('click', () => {
        const el = document.getElementById('landmark-results');
        el.style.display = el.style.display === 'none' ? 'block' : 'none';
    });

    // Search handlers
    document.getElementById('cl-search-btn')?.addEventListener('click', searchCaseLaw);
    document.getElementById('cl-search')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') searchCaseLaw();
    });
}

async function searchCaseLaw() {
    const query = document.getElementById('cl-search')?.value || '';
    if (!query.trim()) {
        showToast('Please enter a search query.', 'warning');
        return;
    }

    const court = document.getElementById('cl-court')?.value || '';
    const sections = document.getElementById('cl-sections')?.value || '';
    const bailType = document.getElementById('cl-bail-type')?.value || 'All';
    const outcome = document.getElementById('cl-outcome')?.value || 'All';
    const year = document.getElementById('cl-year')?.value || '';

    const container = document.getElementById('cl-results');
    container.innerHTML = '<div class="loading-overlay"><div class="spinner spinner-lg"></div><div>Searching judgments...</div></div>';

    try {
        const { results, count } = await api.searchJudgments(query, {
            court, ipc_sections: sections, bail_type: bailType, bail_outcome: outcome, year,
        });

        if (results.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">${icons.search}</div>
                    <div class="empty-title">No judgments found</div>
                    <div class="empty-description">Try different search terms or adjust filters. The semantic search works best with descriptive case scenarios.</div>
                </div>`;
            return;
        }

        container.innerHTML = `
            <div style="margin-bottom: var(--space-4); font-size: var(--text-sm); color: var(--text-secondary)">
                Found <strong>${count}</strong> relevant judgment${count !== 1 ? 's' : ''} ${aiBadge()}
            </div>
            <div style="display: grid; gap: var(--space-4)">
                ${results.map(r => judgmentCard(r)).join('')}
            </div>`;
    } catch (e) {
        container.innerHTML = `<div class="alert alert-warning">${icons.warning} Search unavailable: ${e.message}. The vector store may need to be built first (run build_embeddings.py).</div>`;
    }
}
