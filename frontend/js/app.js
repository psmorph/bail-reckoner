/**
 * Bail Reckoner — Main Application Entry Point
 * SPA router and global event handling.
 */

import { getRole, clearRole, toggleSidebar } from './state.js';

// Page modules
import * as landing from './pages/landing.js';
import * as login from './pages/login.js';
import * as purpose from './pages/purpose.js';
import * as publicHome from './pages/public-home.js';
import * as caseUpload from './pages/case-upload.js';
import * as caseAnalysis from './pages/case-analysis.js';
import * as bailReckoner from './pages/bail-reckoner.js';
import * as legalProvisions from './pages/legal-provisions.js';
import * as caseLawSearch from './pages/case-law-search.js';
import * as lawyerDiscovery from './pages/lawyer-discovery.js';
import * as lawyerProfile from './pages/lawyer-profile.js';
import * as lawyerDashboard from './pages/lawyer-dashboard.js';
import * as policeDashboard from './pages/police-dashboard.js';
import * as judicialDashboard from './pages/judicial-dashboard.js';
import * as caseTimeline from './pages/case-timeline.js';
import * as documentManagement from './pages/document-management.js';
import * as notifications from './pages/notifications.js';
import * as legalAid from './pages/legal-aid.js';
import * as admin from './pages/admin.js';

// ===== Route Table ===========================================================

const routes = {
    '/':                  landing,
    '/login':             login,
    '/purpose':           purpose,
    '/public-home':       publicHome,
    '/case-upload':       caseUpload,
    '/case-analysis':     caseAnalysis,
    '/bail-reckoner':     bailReckoner,
    '/legal-provisions':  legalProvisions,
    '/case-law-search':   caseLawSearch,
    '/lawyer-discovery':  lawyerDiscovery,
    '/lawyer-profile':    lawyerProfile,
    '/lawyer-dashboard':  lawyerDashboard,
    '/police-dashboard':  policeDashboard,
    '/judicial-dashboard': judicialDashboard,
    '/case-timeline':     caseTimeline,
    '/documents':         documentManagement,
    '/notifications':     notifications,
    '/legal-aid':         legalAid,
    '/admin':             admin,
};

// ===== Router ================================================================

function getRoute() {
    const hash = window.location.hash.slice(1) || '/';
    // Strip query parameters for route matching
    return hash.split('?')[0];
}

function navigate() {
    const route = getRoute();
    const page = routes[route];

    if (!page) {
        // Fallback to landing
        document.getElementById('app').innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; text-align: center">
                <div>
                    <div style="font-size: 64px; margin-bottom: 16px">🔍</div>
                    <h2>Page Not Found</h2>
                    <p style="color: var(--text-secondary); margin: 12px 0 24px">The page you're looking for doesn't exist.</p>
                    <a class="btn btn-primary" href="#/">Go Home</a>
                </div>
            </div>`;
        return;
    }

    // Scroll to top
    window.scrollTo(0, 0);

    // Render
    const app = document.getElementById('app');
    app.innerHTML = page.render();

    // Initialize page-specific behavior
    if (page.init) {
        try {
            page.init();
        } catch (e) {
            console.error('Page init error:', e);
        }
    }

    // Attach global event listeners
    attachGlobalListeners();
}

// ===== Global Event Listeners ================================================

function attachGlobalListeners() {
    // Navigation via data-navigate attributes
    document.querySelectorAll('[data-navigate]').forEach(el => {
        // Avoid double-binding
        if (el.dataset.bound) return;
        el.dataset.bound = 'true';

        el.addEventListener('click', (e) => {
            e.preventDefault();
            const target = el.dataset.navigate;
            if (target) {
                window.location.hash = '#' + target;
            }
        });
    });

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', () => {
        clearRole();
        window.location.hash = '#/login';
    });

    // Mobile menu toggle
    document.getElementById('menu-toggle')?.addEventListener('click', () => {
        const sb = document.getElementById('sidebar');
        if (sb) {
            sb.classList.toggle('open');
        }
    });

    // Sidebar overlay close
    document.getElementById('sidebar-overlay')?.addEventListener('click', () => {
        document.getElementById('sidebar')?.classList.remove('open');
    });

    // Language selector
    document.getElementById('lang-selector')?.addEventListener('change', (e) => {
        // Placeholder for language switching
        const lang = e.target.value;
        localStorage.setItem('br_lang', lang);
        // Would trigger re-render with translated content in production
    });

    // Feature card clicks (already handled by data-navigate)
    // Clickable cards
    document.querySelectorAll('.card-clickable, .feature-card, .stakeholder-card').forEach(el => {
        if (el.dataset.bound) return;
        const nav = el.dataset.navigate;
        if (nav) {
            el.dataset.bound = 'true';
            el.style.cursor = 'pointer';
        }
    });
}

// ===== Initialize ============================================================

// Listen for hash changes
window.addEventListener('hashchange', navigate);

// Initial navigation
document.addEventListener('DOMContentLoaded', () => {
    navigate();
});

// Also run on load (for when hash is already set)
navigate();
