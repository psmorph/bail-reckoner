/**
 * Bail Reckoner — Login / Role Selection Page
 */
import { icons } from '../components.js';
import { setRole } from '../state.js';

let selectedRole = null;

export function render() {
    return `
    <div class="login-page">
        <div class="login-container">
            <div class="login-header">
                <div class="login-logo">${icons.scales} BAIL RECKONER</div>
                <h2>Welcome to Bail Reckoner</h2>
                <p>Select how you are using the platform.</p>
            </div>

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

            <div class="login-form" id="login-form" style="display:none">
                <div style="margin-bottom: var(--space-4); text-align: center">
                    <span class="badge badge-primary badge-lg" id="selected-role-badge"></span>
                </div>

                <!-- Sub-role selection for certain roles -->
                <div id="sub-role-section" style="display:none">
                    <div class="form-group" style="margin-bottom: var(--space-4)">
                        <label class="form-label">Your Specific Role</label>
                        <select class="form-select" id="sub-role">
                            <option value="">Select your role...</option>
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Email or Mobile Number</label>
                    <input type="text" class="form-input" id="login-email" placeholder="Enter email or mobile number" value="demo@bailreckoner.in">
                </div>
                <div class="form-group" style="margin-top: var(--space-4)">
                    <label class="form-label">Password</label>
                    <input type="password" class="form-input" id="login-password" placeholder="Enter password" value="demo1234">
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: var(--space-3)">
                    <label class="form-checkbox-group" style="font-size: var(--text-sm)">
                        <input type="checkbox" class="form-checkbox" id="login-otp"> Use OTP instead
                    </label>
                    <a href="#" style="font-size: var(--text-sm)">Forgot password?</a>
                </div>

                <button class="btn btn-primary btn-lg w-full" style="margin-top: var(--space-6)" id="login-btn">
                    Continue ${icons.arrow}
                </button>

                <div class="login-divider">or</div>

                <button class="btn btn-secondary btn-lg w-full" id="create-account-btn">
                    Create Account
                </button>

                <div class="login-footer">
                    <a href="#" data-navigate="/" style="font-size: var(--text-sm)">← Back to Home</a>
                </div>
            </div>

            <div style="text-align: center; margin-top: var(--space-6)">
                <div class="alert alert-disclaimer" style="max-width: 400px; margin: 0 auto">
                    ${icons.lock} Your data is protected. Role-based access controls ensure confidential information is visible only to authorized users.
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

export function init() {
    const roleCards = document.querySelectorAll('.role-card');
    const loginForm = document.getElementById('login-form');
    const subRoleSection = document.getElementById('sub-role-section');
    const subRoleSelect = document.getElementById('sub-role');
    const roleBadge = document.getElementById('selected-role-badge');

    roleCards.forEach(card => {
        card.addEventListener('click', () => {
            roleCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedRole = card.dataset.role;

            loginForm.style.display = 'block';
            roleBadge.textContent = card.dataset.roleName;

            // Show sub-roles
            const subs = subRoles[selectedRole];
            if (subs) {
                subRoleSection.style.display = 'block';
                subRoleSelect.innerHTML = '<option value="">Select your role...</option>' +
                    subs.map(s => `<option value="${s.value}">${s.label}</option>`).join('');
            }

            loginForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
    });

    document.getElementById('login-btn').addEventListener('click', () => {
        if (!selectedRole) return;
        
        // Determine actual role based on sub-role selection
        const subRole = subRoleSelect.value;
        let finalRole = selectedRole;
        let roleName = selectedRole;

        if (subRole === 'judge') {
            finalRole = 'judge';
            roleName = 'Judge';
        } else if (subRole === 'lawyer' || subRole === 'legalaid') {
            finalRole = 'lawyer';
            roleName = 'Lawyer';
        } else if (selectedRole === 'police') {
            finalRole = 'police';
            roleName = 'Law Enforcement';
        } else if (selectedRole === 'public') {
            finalRole = 'public';
            roleName = 'Public User';
        }

        setRole(finalRole, roleName);
        
        // Navigate to appropriate destination
        if (finalRole === 'lawyer') {
            window.location.hash = '#/purpose';
        } else if (finalRole === 'judge') {
            window.location.hash = '#/judicial-dashboard';
        } else if (finalRole === 'police') {
            window.location.hash = '#/police-dashboard';
        } else {
            window.location.hash = '#/purpose';
        }
    });
}
