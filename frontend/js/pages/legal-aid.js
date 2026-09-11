/**
 * Bail Reckoner — Legal Aid Assistance Page
 */
import { navbar, icons, badge, disclaimer, alert } from '../components.js';
import { getRole } from '../state.js';

export function render() {
    const role = getRole();
    const roleName = localStorage.getItem('br_role_name') || 'User';

    return `
    <div class="layout-app">
        ${navbar({ showLinks: false, showRole: true, roleName })}
        <div class="page-content animate-fade-in">
            <div class="page-header">
                <div>
                    <h1 class="page-title">🤝 I Need Legal Assistance</h1>
                    <p class="page-subtitle">Find free or affordable legal aid resources in your area.</p>
                </div>
            </div>

            ${alert('If you or someone you know is in immediate danger or facing an emergency legal situation, please contact the local police (100) or the nearest legal aid authority immediately.', 'danger', 'Emergency')}

            <div class="grid-cols-2" style="margin-top: var(--space-6); gap: var(--space-6)">
                <!-- Form -->
                <div class="card">
                    <h3 style="margin-bottom: var(--space-5)">Tell us about your situation</h3>
                    <div class="form-group" style="margin-bottom: var(--space-4)">
                        <label class="form-label">Your Location</label>
                        <input type="text" class="form-input" placeholder="City or District" value="">
                    </div>
                    <div class="form-group" style="margin-bottom: var(--space-4)">
                        <label class="form-label">Court (if known)</label>
                        <input type="text" class="form-input" placeholder="Name of court">
                    </div>
                    <div class="form-group" style="margin-bottom: var(--space-4)">
                        <label class="form-label">Type of Case</label>
                        <select class="form-select">
                            <option value="">Select...</option>
                            <option>Criminal Case — General</option>
                            <option>Bail Matter</option>
                            <option>Domestic Violence</option>
                            <option>Property Dispute</option>
                            <option>Cyber Crime</option>
                            <option>Economic Offence</option>
                            <option>Other</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin-bottom: var(--space-4)">
                        <label class="form-label">Current Stage</label>
                        <select class="form-select">
                            <option value="">Select...</option>
                            <option>FIR filed</option>
                            <option>Arrested / In custody</option>
                            <option>Charge sheet filed</option>
                            <option>Trial ongoing</option>
                            <option>Appeal</option>
                            <option>Not sure</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin-bottom: var(--space-4)">
                        <label class="form-label">Financial Situation</label>
                        <select class="form-select">
                            <option value="">Select...</option>
                            <option>Cannot afford a private lawyer</option>
                            <option>Need low-cost assistance</option>
                            <option>Can pay standard fees</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin-bottom: var(--space-4)">
                        <label class="form-label">Preferred Language</label>
                        <select class="form-select">
                            <option>English</option>
                            <option>Hindi</option>
                            <option>Marathi</option>
                        </select>
                    </div>
                    <button class="btn btn-primary btn-lg w-full">${icons.search} Find Legal Aid Resources</button>
                </div>

                <!-- Resources -->
                <div>
                    <div class="card" style="margin-bottom: var(--space-4)">
                        <h3 style="margin-bottom: var(--space-4)">Legal Aid Resources</h3>
                        ${[
                            { name: 'District Legal Services Authority (DLSA)', desc: 'Free legal aid for eligible persons including arrested individuals, women, children, and economically weaker sections.', type: 'Government' },
                            { name: 'State Legal Services Authority (SLSA)', desc: 'Provides free legal services and organizes Lok Adalats for alternative dispute resolution.', type: 'Government' },
                            { name: 'National Legal Services Authority (NALSA)', desc: 'Supreme body for legal aid. Helpline: 15100.', type: 'Government' },
                        ].map(r => `
                            <div style="padding: var(--space-4); border: 1px solid var(--border-light); border-radius: var(--radius-md); margin-bottom: var(--space-3)">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start">
                                    <div style="font-weight: 600">${r.name}</div>
                                    ${badge(r.type, 'success')}
                                </div>
                                <p style="font-size: var(--text-sm); margin-top: var(--space-2)">${r.desc}</p>
                            </div>
                        `).join('')}
                    </div>

                    <div class="card" style="background: var(--warning-50); border-color: var(--warning-200)">
                        <h4 style="margin-bottom: var(--space-2); color: var(--warning-700)">${icons.warning} Important</h4>
                        <p style="font-size: var(--text-sm); color: var(--warning-700)">
                            Under Article 39A of the Constitution and the Legal Services Authorities Act 1987, 
                            free legal aid is available to persons arrested and in custody who are unable to engage a lawyer. 
                            This is a fundamental right.
                        </p>
                    </div>

                    ${disclaimer()}
                </div>
            </div>
        </div>
    </div>`;
}

export function init() {}
