/**
 * Bail Reckoner — Lawyer Profile Page
 */
import { navbar, icons, badge } from '../components.js';
import { getRole } from '../state.js';
import { sampleLawyers } from '../data.js';

export function render() {
    const role = getRole();
    const roleName = localStorage.getItem('br_role_name') || 'User';
    const l = sampleLawyers[0]; // Default to first lawyer

    return `
    <div class="layout-app">
        ${navbar({ showLinks: false, showRole: true, roleName })}
        <div class="page-content animate-fade-in">
            <div class="page-header">
                <div>
                    <div class="page-breadcrumb">
                        <span class="breadcrumb-link" data-navigate="/lawyer-discovery">Find a Lawyer</span>
                        <span class="breadcrumb-sep">›</span>
                        <span>${l.name}</span>
                    </div>
                </div>
            </div>

            <div class="lawyer-profile-page">
                <!-- Sidebar Profile Card -->
                <div class="lawyer-profile-sidebar">
                    <div class="lawyer-profile-card">
                        <div class="lp-avatar">${l.initials}</div>
                        <div class="lp-name">${l.name} ${l.verified ? '✅' : ''}</div>
                        <div class="lp-title">Criminal Law Advocate</div>
                        <div style="margin-top: var(--space-3)">
                            ${badge(l.availability, l.availability === 'Available' ? 'success' : 'warning')}
                        </div>
                        <div style="margin-top: var(--space-4); font-size: var(--text-sm); color: var(--text-secondary)">
                            ${l.experience} years of experience
                        </div>
                        <div style="margin-top: var(--space-2); font-size: var(--text-sm); color: var(--text-secondary)">
                            📍 ${l.location}
                        </div>
                        <div style="display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: var(--space-4); justify-content: center">
                            ${l.languages.map(lang => badge(lang, 'neutral')).join('')}
                        </div>
                        <button class="btn btn-primary w-full" style="margin-top: var(--space-6)">Request Consultation</button>
                        <button class="btn btn-outline w-full" style="margin-top: var(--space-3)">Send Message</button>
                    </div>

                    <!-- Verification -->
                    <div class="card" style="margin-top: var(--space-4)">
                        <h4 style="margin-bottom: var(--space-3); font-size: var(--text-sm)">Verification</h4>
                        <div style="font-size: var(--text-sm)">
                            <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--neutral-100)">
                                <span style="color: var(--text-secondary)">Bar ID</span>
                                <span>${l.barId}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 6px 0">
                                <span style="color: var(--text-secondary)">Status</span>
                                ${badge('Verified', 'success')}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Main Content -->
                <div>
                    <!-- About -->
                    <div class="card" style="margin-bottom: var(--space-4)">
                        <h3 style="margin-bottom: var(--space-3)">About</h3>
                        <p style="line-height: var(--leading-relaxed)">
                            ${l.name} is an experienced criminal law advocate with ${l.experience} years of practice. 
                            Specializing in ${l.practiceAreas.join(', ')}, they have handled over ${l.cases} cases 
                            across ${l.courts.join(', ')}. Known for thorough case preparation and strong 
                            advocacy in bail matters.
                        </p>
                    </div>

                    <!-- Practice Areas -->
                    <div class="card" style="margin-bottom: var(--space-4)">
                        <h3 style="margin-bottom: var(--space-3)">Practice Areas</h3>
                        <div style="display: flex; flex-wrap: wrap; gap: var(--space-2)">
                            ${l.practiceAreas.map(a => badge(a, 'primary')).join('')}
                            ${badge('Bail Applications', 'info')}
                            ${badge('Criminal Trials', 'info')}
                            ${badge('Appeals', 'info')}
                        </div>
                    </div>

                    <!-- Courts -->
                    <div class="card" style="margin-bottom: var(--space-4)">
                        <h3 style="margin-bottom: var(--space-3)">Courts Practiced In</h3>
                        ${l.courts.map(c => `
                            <div style="display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) 0; font-size: var(--text-sm)">
                                <span style="color: var(--success-500)">✓</span> ${c}
                            </div>
                        `).join('')}
                    </div>

                    <!-- Education -->
                    <div class="card" style="margin-bottom: var(--space-4)">
                        <h3 style="margin-bottom: var(--space-3)">Education</h3>
                        <div style="font-size: var(--text-sm)">
                            <div style="display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) 0">
                                🎓 ${l.education}
                            </div>
                        </div>
                    </div>

                    <!-- Cases I Can Help With -->
                    <div class="card" style="margin-bottom: var(--space-4)">
                        <h3 style="margin-bottom: var(--space-3)">Cases I Can Help With</h3>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-3)">
                            ${['Bail Applications (Regular & Anticipatory)', 'Criminal Trials & Appeals', 'Economic Offences & Fraud', 'Property Disputes with Criminal Elements', 'FIR Quashing Petitions', 'Revision Applications'].map(c => `
                                <div style="display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2); background: var(--neutral-50); border-radius: var(--radius-md); font-size: var(--text-sm)">
                                    <span style="color: var(--primary-500)">•</span> ${c}
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- CTA -->
                    <div class="card" style="text-align: center; background: var(--primary-50); border-color: var(--primary-200)">
                        <h3 style="margin-bottom: var(--space-2)">Need legal assistance?</h3>
                        <p style="margin-bottom: var(--space-4); font-size: var(--text-sm); color: var(--text-secondary)">
                            Send a consultation request to discuss your case with ${l.name}.
                        </p>
                        <button class="btn btn-primary btn-lg">Request Consultation</button>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}

export function init() {}
