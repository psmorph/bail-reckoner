/**
 * NyaySetu — Main Application Entry Point
 * SPA router and global event handling.
 */

import { clearAuth, getAuthToken, hasPermission, isAuthenticated, setAuth, setLanguage, getLanguage } from './state.js';
import { languages, translateDocument } from './i18n.js';
import * as api from './api.js';

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

// Platform pages (new)
import * as caseSearch from './pages/case-search.js';
import * as caseDetails from './pages/case-details.js';

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
    // Platform routes
    '/case-search':       caseSearch,
    '/case-details':      caseDetails,
};

// Routes that support path parameters (e.g., /case-details/CASE-2026-00001)
const paramRoutes = [
    '/case-details',
];

const routePermissions = {
    '/admin': ['system:admin', 'audit:read'],
    '/police-dashboard': ['case:create'],
    '/judicial-dashboard': ['court:read'],
};

let authValidation = null;
let navigationToken = 0;

// ===== Router ================================================================

function getRoute() {
    const hash = window.location.hash.slice(1) || '/';
    // Strip query parameters for route matching
    return hash.split('?')[0];
}

function resolveRoute(route) {
    // Exact match first
    if (routes[route]) return routes[route];
    // Parameterized route match (e.g., /case-details/CASE-2026-00001)
    for (const prefix of paramRoutes) {
        if (route.startsWith(prefix + '/')) return routes[prefix];
    }
    return null;
}

async function validateStoredAuth() {
    if (!authValidation) {
        authValidation = (async () => {
            const token = getAuthToken();
            if (!token) return true;
            try {
                const user = await api.getProfile();
                setAuth(token, user);
                return true;
            } catch (error) {
                clearAuth();
                return false;
            }
        })();
    }
    return authValidation;
}

async function navigate() {
    const currentNavigation = ++navigationToken;
    const authValid = await validateStoredAuth();
    if (currentNavigation !== navigationToken) return;
    if (!authValid) {
        window.location.hash = '#/login';
        if (getRoute() !== '/login') return;
    }

    const route = getRoute();
    const page = resolveRoute(route);

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

    if (route !== '/' && route !== '/login' && !isAuthenticated()) {
        window.location.hash = '#/login';
        return;
    }

    const requiredPermissions = routePermissions[route];
    if (requiredPermissions && !requiredPermissions.some(hasPermission)) {
        document.getElementById('app').innerHTML = `
            <div class="page-content">
                <div class="card" role="alert">
                    <h1>Not authorized</h1>
                    <p>Your account does not have permission to view this page.</p>
                    <a class="btn btn-primary" href="#/">Go home</a>
                </div>
            </div>`;
        return;
    }

    // Scroll to top
    window.scrollTo(0, 0);

    // Render
    const app = document.getElementById('app');
    app.innerHTML = page.render();
    document.documentElement.lang = getLanguage();
    translateDocument(app);
    attachGlobalListeners();

    if (page.init) {
        Promise.resolve()
            .then(() => page.init())
            .catch(error => {
                if (currentNavigation === navigationToken) showErrorPage(error);
            });
    }
}

function showErrorPage(error) {
    console.error('Page initialization failed:', error);
    document.getElementById('app').innerHTML = `
        <div class="page-content">
            <div class="card" role="alert">
                <h1>Unable to load this page</h1>
                <p>Please try again. If the problem continues, contact your administrator.</p>
                <a class="btn btn-primary" href="#/">Go home</a>
            </div>
        </div>`;
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

    document.querySelectorAll('[data-accordion-toggle]').forEach(button => {
        if (button.dataset.bound) return;
        button.dataset.bound = 'true';
        button.addEventListener('click', () => button.closest('.accordion-item')?.classList.toggle('open'));
    });

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
        try {
            await api.platformLogout();
        } catch (error) {
            console.warn('Server logout failed:', error);
        }
        clearAuth();
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
    const languageSelector = document.getElementById('lang-selector');
    if (languageSelector) {
        languageSelector.innerHTML = languages.map(language => `<option value="${language.value}">${language.label}</option>`).join('');
        languageSelector.value = getLanguage();
        languageSelector.addEventListener('change', (e) => {
            setLanguage(e.target.value);
            navigate();
        });
    }

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

if (document.readyState !== 'loading') {
    navigate();
} else {
    document.addEventListener('DOMContentLoaded', navigate, { once: true });
}
