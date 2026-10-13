/**
 * NyaySetu — Platform login page.
 */
import { icons, escapeHtml } from '../components.js';
import { clearAuth, getAuthUser, isAuthenticated, setAuth } from '../state.js';
import * as api from '../api.js';

let isLoading = false;

const roleDashboardMap = {
    master_admin: '/admin',
    police_admin: '/police-dashboard',
    police_officer: '/police-dashboard',
    investigator: '/police-dashboard',
    forensic_officer: '/judicial-dashboard',
    court_admin: '/judicial-dashboard',
    court_officer: '/judicial-dashboard',
    auditor: '/admin',
};

const demoAccounts = [
    ['si.sharma@police.dl.in', 'Police Officer'],
    ['io.singh@police.dl.in', 'Investigator'],
    ['dr.rao@fsl.dl.in', 'Forensic Officer'],
    ['officer.jain@phc.dl.in', 'Court Officer'],
    ['admin@bailreckoner.in', 'Master Admin'],
    ['auditor@bailreckoner.in', 'Auditor'],
];

export function render() {
    const user = getAuthUser();
    const authenticated = isAuthenticated() && user;

    return `
    <div class="login-page">
        <div class="login-container">
            <div class="login-header">
                <div class="login-logo">${icons.scales} NYAYSETU</div>
                <h2>Secure Legal Intelligence Platform</h2>
                <p>Sign in with your platform credentials.</p>
            </div>
            ${authenticated ? `
                <div class="card" style="text-align: center; margin-bottom: var(--space-6)">
                    <div style="font-size: 48px; margin-bottom: var(--space-3)">👤</div>
                    <div style="font-weight: var(--weight-semibold); font-size: var(--text-lg)">${escapeHtml(user.full_name)}</div>
                    <div style="color: var(--text-secondary); margin-bottom: var(--space-2)">${escapeHtml(user.email)}</div>
                    <span class="badge badge-primary badge-lg">${escapeHtml(user.role_name)}</span>
                    ${user.organization_name ? `<div style="color: var(--text-tertiary); margin-top: var(--space-2); font-size: var(--text-sm)">${escapeHtml(user.organization_name)}</div>` : ''}
                    <div style="display: flex; gap: var(--space-3); justify-content: center; margin-top: var(--space-5)">
                        <button class="btn btn-primary" id="continue-session-btn">Continue as ${escapeHtml((user.full_name || '').split(' ')[0])} →</button>
                        <button class="btn btn-outline" id="switch-account-btn">Switch Account</button>
                    </div>
                </div>` : ''}

            <div class="form-group">
                <label class="form-label" for="login-email">${icons.mail} Email Address</label>
                <input type="email" class="form-input" id="login-email" placeholder="Enter your email" autocomplete="email">
            </div>
            <div class="form-group" style="margin-top: var(--space-4)">
                <label class="form-label" for="login-password">${icons.lock} Password</label>
                <input type="password" class="form-input" id="login-password" placeholder="Enter password" autocomplete="current-password">
            </div>
            <div id="login-error" class="alert alert-danger" style="display: none; margin-top: var(--space-4)">
                <span class="alert-icon">${icons.danger}</span>
                <div class="alert-content" id="login-error-msg"></div>
            </div>
            <button class="btn btn-primary btn-lg w-full" style="margin-top: var(--space-6)" id="platform-login-btn">
                ${icons.lock} Sign In Securely
            </button>
            <div id="demo-accounts"></div>
            <div style="text-align: center; margin-top: var(--space-6)">
                <div class="alert alert-disclaimer" style="max-width: 400px; margin: 0 auto">
                    ${icons.lock} All access is logged and audited. Role-based controls enforce document confidentiality.
                </div>
            </div>
        </div>
    </div>`;
}

export async function init() {
    document.getElementById('continue-session-btn')?.addEventListener('click', () => {
        const user = getAuthUser();
        if (user) window.location.hash = `#${roleDashboardMap[user.role_id] || '/purpose'}`;
    });

    document.getElementById('switch-account-btn')?.addEventListener('click', async () => {
        try {
            await api.platformLogout();
        } catch (error) {
            console.warn('Server logout failed while switching accounts:', error);
        }
        clearAuth();
        window.location.hash = '#/login';
    });

    document.getElementById('platform-login-btn')?.addEventListener('click', handlePlatformLogin);
    document.getElementById('login-password')?.addEventListener('keypress', event => {
        if (event.key === 'Enter') handlePlatformLogin();
    });

    try {
        const config = await api.getConfig();
        if (config.demo === true) renderDemoAccounts();
    } catch (error) {
        console.warn('Unable to load demo-mode configuration:', error);
    }
}

function renderDemoAccounts() {
    const container = document.getElementById('demo-accounts');
    if (!container) return;
    container.innerHTML = `
        <div style="text-align: center; margin-top: var(--space-5)">
            <div class="card" style="padding: var(--space-4); background: var(--neutral-50)">
                <div style="font-size: var(--text-xs); color: var(--text-tertiary); font-weight: var(--weight-semibold); margin-bottom: var(--space-2)">DEMO ACCOUNTS (password: demo1234)</div>
                <div class="demo-account-list" style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2); font-size: var(--text-xs)">
                    ${demoAccounts.map(([email, label]) => `<button class="btn btn-ghost btn-sm demo-fill" data-email="${escapeHtml(email)}" style="justify-content: flex-start">${escapeHtml(label)}</button>`).join('')}
                </div>
            </div>
        </div>`;
    container.querySelectorAll('.demo-fill').forEach(button => {
        button.addEventListener('click', () => {
            document.getElementById('login-email').value = button.dataset.email;
            document.getElementById('login-password').value = 'demo1234';
        });
    });
}

async function handlePlatformLogin() {
    if (isLoading) return;
    const email = document.getElementById('login-email')?.value?.trim();
    const password = document.getElementById('login-password')?.value;
    const errorDiv = document.getElementById('login-error');
    const errorMsg = document.getElementById('login-error-msg');
    const button = document.getElementById('platform-login-btn');

    if (!email || !password) {
        if (errorDiv && errorMsg) {
            errorMsg.textContent = 'Please enter both email and password.';
            errorDiv.style.display = 'flex';
        }
        return;
    }

    isLoading = true;
    if (button) button.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px"></div> Signing in...';
    if (errorDiv) errorDiv.style.display = 'none';

    try {
        const result = await api.platformLogin(email, password);
        setAuth(result.access_token, result.user);
        window.location.hash = `#${roleDashboardMap[result.user.role_id] || '/purpose'}`;
    } catch (error) {
        isLoading = false;
        if (button) button.innerHTML = `${icons.lock} Sign In Securely`;
        if (errorDiv && errorMsg) {
            errorMsg.textContent = error.message || 'Login failed. Please check your credentials.';
            errorDiv.style.display = 'flex';
        }
    }
}
