/**
 * Bail Reckoner — Login Page
 * Supports both platform authentication (JWT) and legacy role selection.
 */
import { icons } from '../components.js';
import { setRole, setAuth, isAuthenticated, getAuthUser } from '../state.js';
import * as api from '../api.js';

let loginMode = 'platform'; // 'platform' | 'legacy'
let isLoading = false;

// Role mapping: platform role_id → dashboard route
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

export function render() {
    // If already authenticated, show redirect option
    const user = getAuthUser();
    const authenticated = isAuthenticated() && user;

    return `
    <div class="login-page">
        <div class="login-container">
            <div class="login-header">
                <div class="login-logo">${icons.scales} BAIL RECKONER</div>
                <h2>Secure Legal Intelligence Platform</h2>
                <p>Sign in with your platform credentials.</p>
            </div>

            ${authenticated ? `
                <div class="card" style="text-align: center; margin-bottom: var(--space-6)">
                    <div style="font-size: 48px; margin-bottom: var(--space-3)">👤</div>
                    <div style="font-weight: var(--weight-semibold); font-size: var(--text-lg)">${user.full_name}</div>
                    <div style="color: var(--text-secondary); margin-bottom: var(--space-2)">${user.email}</div>
                    <span class="badge badge-primary badge-lg">${user.role_name}</span>
                    ${user.organization_name ? `<div style="color: var(--text-tertiary); margin-top: var(--space-2); font-size: var(--text-sm)">${user.organization_name}</div>` : ''}
                    <div style="display: flex; gap: var(--space-3); justify-content: center; margin-top: var(--space-5)">
                        <button class="btn btn-primary" id="continue-session-btn">Continue as ${user.full_name.split(' ')[0]} →</button>
                        <button class="btn btn-outline" id="switch-account-btn">Switch Account</button>
                    </div>
                </div>
            ` : ''}

            <!-- Login Mode Tabs -->
            <div class="login-tabs" style="display: flex; gap: var(--space-2); margin-bottom: var(--space-5)">
                <button class="btn ${loginMode === 'platform' ? 'btn-primary' : 'btn-ghost'} btn-sm" id="tab-platform" style="flex: 1">
                    ${icons.lock} Platform Login
                </button>
                <button class="btn ${loginMode === 'legacy' ? 'btn-primary' : 'btn-ghost'} btn-sm" id="tab-legacy" style="flex: 1">
                    ${icons.user} Quick Role Access
                </button>
            </div>

            <!-- Platform Login Form -->
            <div id="platform-login" style="display: ${loginMode === 'platform' ? 'block' : 'none'}">
                <div class="form-group">
                    <label class="form-label">${icons.mail} Email Address</label>
                    <input type="email" class="form-input" id="login-email" placeholder="Enter your email" value="si.sharma@police.dl.in" autocomplete="email">
                </div>
                <div class="form-group" style="margin-top: var(--space-4)">
                    <label class="form-label">${icons.lock} Password</label>
                    <input type="password" class="form-input" id="login-password" placeholder="Enter password" value="demo1234" autocomplete="current-password">
                </div>

                <div id="login-error" class="alert alert-danger" style="display: none; margin-top: var(--space-4)">
                    <span class="alert-icon">${icons.danger}</span>
                    <div class="alert-content" id="login-error-msg"></div>
                </div>

                <button class="btn btn-primary btn-lg w-full" style="margin-top: var(--space-6)" id="platform-login-btn">
                    ${icons.lock} Sign In Securely
                </button>

                <div style="text-align: center; margin-top: var(--space-5)">
                    <div class="card" style="padding: var(--space-4); background: var(--neutral-50)">
                        <div style="font-size: var(--text-xs); color: var(--text-tertiary); font-weight: var(--weight-semibold); margin-bottom: var(--space-2)">DEMO ACCOUNTS (password: demo1234)</div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2); font-size: var(--text-xs)">
                            <button class="btn btn-ghost btn-sm demo-fill" data-email="si.sharma@police.dl.in" style="justify-content: flex-start">👮 Police Officer</button>
                            <button class="btn btn-ghost btn-sm demo-fill" data-email="io.singh@police.dl.in" style="justify-content: flex-start">🔍 Investigator</button>
                            <button class="btn btn-ghost btn-sm demo-fill" data-email="dr.rao@fsl.dl.in" style="justify-content: flex-start">🔬 Forensic Officer</button>
                            <button class="btn btn-ghost btn-sm demo-fill" data-email="officer.jain@phc.dl.in" style="justify-content: flex-start">🏛️ Court Officer</button>
                            <button class="btn btn-ghost btn-sm demo-fill" data-email="admin@bailreckoner.in" style="justify-content: flex-start">⚙️ Master Admin</button>
                            <button class="btn btn-ghost btn-sm demo-fill" data-email="auditor@bailreckoner.in" style="justify-content: flex-start">📋 Auditor</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Legacy Role Selection (kept for backward compatibility) -->
            <div id="legacy-login" style="display: ${loginMode === 'legacy' ? 'block' : 'none'}">
                <div class="role-cards" id="role-cards">
                    <div class="role-card" data-role="lawyer" data-role-name="Legal Professional">
                        <div class="role-icon">👨‍⚖️</div>
                        <div class="role-title">Legal Professional</div>
                        <div class="role-desc">Lawyer / Judge / Legal Aid</div>
                    </div>
                    <div class="role-card" data-role="police" data-role-name="Law Enforcement">
                        <div class="role-icon">👮</div>
                        <div class="role-title">Law Enforcement</div>
                        <div class="role-desc">Police / IO / Official</div>
                    </div>
                    <div class="role-card" data-role="public" data-role-name="Public User">
                        <div class="role-icon">👤</div>
                        <div class="role-title">Public User</div>
                        <div class="role-desc">Accused / Relative / Citizen</div>
                    </div>
                </div>

                <div class="login-form" id="legacy-form" style="display:none">
                    <div style="margin-bottom: var(--space-4); text-align: center">
                        <span class="badge badge-primary badge-lg" id="selected-role-badge"></span>
                    </div>
                    <div id="sub-role-section" style="display:none">
                        <div class="form-group" style="margin-bottom: var(--space-4)">
                            <label class="form-label">Your Specific Role</label>
                            <select class="form-select" id="sub-role">
                                <option value="">Select your role...</option>
                            </select>
                        </div>
                    </div>
                    <button class="btn btn-primary btn-lg w-full" id="legacy-login-btn">
                        Continue ${icons.arrow}
                    </button>
                </div>
            </div>

            <div style="text-align: center; margin-top: var(--space-6)">
                <div class="alert alert-disclaimer" style="max-width: 400px; margin: 0 auto">
                    ${icons.lock} All access is logged and audited. Role-based controls enforce document confidentiality.
                </div>
            </div>
        </div>
    </div>`;
}

const subRoles = {
    lawyer: [
        { value: 'lawyer', label: 'Lawyer / Advocate' },
        { value: 'judge', label: 'Judge / Authorized Judicial User' },
        { value: 'legalaid', label: 'Legal Aid Provider' },
    ],
    police: [
        { value: 'police', label: 'Police Officer' },
        { value: 'io', label: 'Investigating Officer' },
        { value: 'official', label: 'Authorized Crime-related Official' },
    ],
    public: [
        { value: 'accused', label: 'Accused / Undertrial Prisoner' },
        { value: 'relative', label: 'Relative of Accused' },
        { value: 'citizen', label: 'Common Citizen' },
    ],
};

let selectedRole = null;

export function init() {
    // Tab switching
    document.getElementById('tab-platform')?.addEventListener('click', () => {
        loginMode = 'platform';
        document.getElementById('platform-login').style.display = 'block';
        document.getElementById('legacy-login').style.display = 'none';
        document.getElementById('tab-platform').className = 'btn btn-primary btn-sm';
        document.getElementById('tab-legacy').className = 'btn btn-ghost btn-sm';
    });

    document.getElementById('tab-legacy')?.addEventListener('click', () => {
        loginMode = 'legacy';
        document.getElementById('platform-login').style.display = 'none';
        document.getElementById('legacy-login').style.display = 'block';
        document.getElementById('tab-legacy').className = 'btn btn-primary btn-sm';
        document.getElementById('tab-platform').className = 'btn btn-ghost btn-sm';
    });

    // Continue existing session
    document.getElementById('continue-session-btn')?.addEventListener('click', () => {
        const user = getAuthUser();
        if (user) {
            const dest = roleDashboardMap[user.role_id] || '/purpose';
            window.location.hash = '#' + dest;
        }
    });

    document.getElementById('switch-account-btn')?.addEventListener('click', () => {
        import('../state.js').then(s => {
            s.clearRole();
            window.location.hash = '#/login';
        });
    });

    // Platform login
    document.getElementById('platform-login-btn')?.addEventListener('click', handlePlatformLogin);

    // Enter key on password field
    document.getElementById('login-password')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handlePlatformLogin();
    });

    // Demo account quick-fill
    document.querySelectorAll('.demo-fill').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('login-email').value = btn.dataset.email;
            document.getElementById('login-password').value = 'demo1234';
        });
    });

    // Legacy role selection
    const roleCards = document.querySelectorAll('.role-card');
    const legacyForm = document.getElementById('legacy-form');
    const subRoleSection = document.getElementById('sub-role-section');
    const subRoleSelect = document.getElementById('sub-role');
    const roleBadge = document.getElementById('selected-role-badge');

    roleCards.forEach(card => {
        card.addEventListener('click', () => {
            roleCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedRole = card.dataset.role;

            if (legacyForm) legacyForm.style.display = 'block';
            if (roleBadge) roleBadge.textContent = card.dataset.roleName;

            const subs = subRoles[selectedRole];
            if (subs && subRoleSection && subRoleSelect) {
                subRoleSection.style.display = 'block';
                subRoleSelect.innerHTML = '<option value="">Select your role...</option>' +
                    subs.map(s => `<option value="${s.value}">${s.label}</option>`).join('');
            }

            legacyForm?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
    });

    document.getElementById('legacy-login-btn')?.addEventListener('click', () => {
        if (!selectedRole) return;
        const subRole = document.getElementById('sub-role')?.value;
        let finalRole = selectedRole;
        let roleName = selectedRole;

        if (subRole === 'judge') { finalRole = 'judge'; roleName = 'Judge'; }
        else if (subRole === 'lawyer' || subRole === 'legalaid') { finalRole = 'lawyer'; roleName = 'Lawyer'; }
        else if (selectedRole === 'police') { finalRole = 'police'; roleName = 'Law Enforcement'; }
        else if (selectedRole === 'public') { finalRole = 'public'; roleName = 'Public User'; }

        setRole(finalRole, roleName);

        if (finalRole === 'lawyer') window.location.hash = '#/purpose';
        else if (finalRole === 'judge') window.location.hash = '#/judicial-dashboard';
        else if (finalRole === 'police') window.location.hash = '#/police-dashboard';
        else window.location.hash = '#/purpose';
    });
}

async function handlePlatformLogin() {
    if (isLoading) return;
    const email = document.getElementById('login-email')?.value?.trim();
    const password = document.getElementById('login-password')?.value;
    const errorDiv = document.getElementById('login-error');
    const errorMsg = document.getElementById('login-error-msg');
    const btn = document.getElementById('platform-login-btn');

    if (!email || !password) {
        if (errorDiv && errorMsg) {
            errorMsg.textContent = 'Please enter both email and password.';
            errorDiv.style.display = 'flex';
        }
        return;
    }

    isLoading = true;
    if (btn) btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px"></div> Signing in...';
    if (errorDiv) errorDiv.style.display = 'none';

    try {
        const result = await api.platformLogin(email, password);
        // Store auth state
        setAuth(result.access_token, result.user);
        // Navigate to appropriate dashboard
        const dest = roleDashboardMap[result.user.role_id] || '/purpose';
        window.location.hash = '#' + dest;
    } catch (err) {
        isLoading = false;
        if (btn) btn.innerHTML = `${icons.lock} Sign In Securely`;
        if (errorDiv && errorMsg) {
            errorMsg.textContent = err.message || 'Login failed. Please check your credentials.';
            errorDiv.style.display = 'flex';
        }
    }
}
