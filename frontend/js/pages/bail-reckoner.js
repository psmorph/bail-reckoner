/**
 * Bail Reckoner — Bail Assessment Page
 */
import { navbar, icons, badge, aiBadge, disclaimer, accordion, alert } from '../components.js';
import { getRole, getCurrentCase } from '../state.js';
import { sampleCase } from '../data.js';
import * as api from '../api.js';

export function render() {
    const role = getRole();
    const roleName = localStorage.getItem('br_role_name') || 'User';
    const caseData = getCurrentCase();
    const assessment = caseData?.assessment || {};
    const custodyDays = caseData?.custody_days || 0;
    const input = caseData?.input || {};
    const sc = sampleCase;

    const hasTriggers = assessment.triggers && assessment.triggers.length > 0;

    return `
    <div class="layout-app">
        ${navbar({ showLinks: false, showRole: true, roleName })}
        <div class="page-content animate-fade-in">
            <div class="page-header">
                <div>
                    <div class="page-breadcrumb">
                        <span class="breadcrumb-link" data-navigate="/purpose">Home</span>
                        <span class="breadcrumb-sep">›</span>
                        <span class="breadcrumb-link" data-navigate="/case-analysis">Case Analysis</span>
                        <span class="breadcrumb-sep">›</span>
                        <span>Bail Assessment</span>
                    </div>
                    <h1 class="page-title">Bail Reckoner Assessment</h1>
                </div>
                <div class="page-actions">
                    <button class="btn btn-outline btn-sm" data-navigate="/case-analysis">${icons.arrow} Back to Analysis</button>
                    <button class="btn btn-primary btn-sm" data-navigate="/lawyer-discovery">${icons.lawyer} Find a Lawyer</button>
                </div>
            </div>

            ${disclaimer()}

            <div class="assessment-page" style="margin-top: var(--space-6)">
                <div class="assessment-main">
                    
                    <!-- Main Status Card -->
                    <div class="assessment-status status-review" style="margin-bottom: var(--space-6)">
                        <div class="status-icon">⚠️</div>
                        <div>
                            <div class="status-title">Potentially Eligible — Legal Review Required</div>
                            <div class="status-subtitle">Based on the currently available case information and applicable statutory parameters.</div>
                        </div>
                        ${aiBadge()}
                    </div>

                    ${alert(
                        'This is a preliminary information-based screening. It does NOT constitute legal advice, a bail prediction, or a judicial determination. A qualified lawyer and the appropriate court must assess the actual case.',
                        'warning',
                        'Important Disclaimer'
                    )}

                    <!-- Assessment Cards Grid -->
                    <div class="assessment-cards">
                        
                        <!-- Offence Classification -->
                        <div class="assessment-card">
                            <div class="ac-title">${icons.scales} Offence Classification</div>
                            <div class="ac-row"><span class="ac-label">Bailable / Non-Bailable</span><span class="ac-value">${badge('Non-Bailable', 'warning')}</span></div>
                            <div class="ac-row"><span class="ac-label">Cognizable</span><span class="ac-value">${badge('Cognizable', 'info')}</span></div>
                            <div class="ac-row"><span class="ac-label">Compoundable</span><span class="ac-value">${badge('Non-Compoundable', 'neutral')}</span></div>
                            <div class="ac-row"><span class="ac-label">Category</span><span class="ac-value">Economic / Property</span></div>
                        </div>

                        <!-- Custody Analysis -->
                        <div class="assessment-card">
                            <div class="ac-title">${icons.clock} Custody Analysis</div>
                            <div class="ac-row"><span class="ac-label">Date of Arrest</span><span class="ac-value">${input.arrestDate || sc.arrestDate}</span></div>
                            <div class="ac-row"><span class="ac-label">Current Custody</span><span class="ac-value"><strong>${custodyDays} days</strong></span></div>
                            <div class="ac-row"><span class="ac-label">Relevant Threshold</span><span class="ac-value">½ of max sentence</span></div>
                            <div class="ac-row"><span class="ac-label">Threshold Status</span><span class="ac-value">${badge(custodyDays > 365 ? 'Threshold Approaching' : 'Below Threshold', custodyDays > 365 ? 'warning' : 'info')}</span></div>
                        </div>

                        <!-- Punishment Information -->
                        <div class="assessment-card">
                            <div class="ac-title">${icons.gavel} Punishment Information</div>
                            <div class="ac-row"><span class="ac-label">Applicable Provision</span><span class="ac-value">§420 IPC (most severe)</span></div>
                            <div class="ac-row"><span class="ac-label">Minimum Punishment</span><span class="ac-value">—</span></div>
                            <div class="ac-row"><span class="ac-label">Maximum Punishment</span><span class="ac-value">Up to 7 years</span></div>
                            <div class="ac-row"><span class="ac-label">Custody Undergone</span><span class="ac-value">${custodyDays} days (${(custodyDays / 365 * 100).toFixed(0)}% of 1 year)</span></div>
                        </div>

                        <!-- Special Statutes -->
                        <div class="assessment-card">
                            <div class="ac-title">${icons.doc} Special Statutes</div>
                            ${input.specialLaws ? `
                                <div class="ac-row"><span class="ac-label">Special Act</span><span class="ac-value">${input.specialLaws}</span></div>
                                <div class="ac-row"><span class="ac-label">Restrictions</span><span class="ac-value">${badge('May Apply', 'warning')}</span></div>
                            ` : `
                                <div style="padding: var(--space-4); text-align: center; color: var(--text-secondary); font-size: var(--text-sm)">
                                    No special statute restrictions identified based on the current case information.
                                </div>
                            `}
                        </div>
                    </div>

                    <!-- Judicial Considerations -->
                    <div class="card" style="margin-top: var(--space-6)">
                        <h3 style="margin-bottom: var(--space-4)">${icons.judge} Judicial Considerations</h3>
                        <p style="font-size: var(--text-sm); color: var(--text-secondary); margin-bottom: var(--space-4)">
                            These factors require human judicial assessment and cannot be determined by automated analysis.
                        </p>
                        <div class="ac-row"><span class="ac-label">Flight Risk Assessment</span><span class="ac-value">${badge('Requires Human Assessment', 'neutral')}</span></div>
                        <div class="ac-row"><span class="ac-label">Witness / Evidence Concerns</span><span class="ac-value">${badge('Requires Human Assessment', 'neutral')}</span></div>
                        <div class="ac-row"><span class="ac-label">Previous Bail Applications</span><span class="ac-value">${badge('Not Available', 'neutral')}</span></div>
                        <div class="ac-row"><span class="ac-label">Prosecution Objections</span><span class="ac-value">${badge('Requires Court Hearing', 'neutral')}</span></div>
                        <div class="ac-row"><span class="ac-label">Personal Circumstances</span><span class="ac-value">${badge('Requires Human Assessment', 'neutral')}</span></div>
                    </div>

                    <!-- Review Triggers -->
                    ${hasTriggers ? `
                    <div class="card" style="margin-top: var(--space-6)">
                        <h3 style="margin-bottom: var(--space-4)">${icons.warning} Review Triggers from Analysis</h3>
                        ${assessment.triggers.map(t => `
                            <div style="display: flex; align-items: flex-start; gap: var(--space-3); padding: var(--space-3) 0; border-bottom: 1px solid var(--neutral-100)">
                                <span style="color: var(--warning-500); flex-shrink: 0">⚠</span>
                                <span style="font-size: var(--text-sm)">${t}</span>
                            </div>`).join('')}
                    </div>` : ''}

                    <!-- Reasoning Section -->
                    <div class="reasoning-section" style="margin-top: var(--space-6)">
                        <div class="reasoning-header" onclick="document.getElementById('reasoning-body').style.display = document.getElementById('reasoning-body').style.display === 'none' ? 'block' : 'none'">
                            <h3 style="font-size: var(--text-md)">${icons.bulb} Why did the system reach this assessment?</h3>
                            <span>▾</span>
                        </div>
                        <div class="reasoning-body" id="reasoning-body">
                            <div class="reasoning-item">
                                <span style="color: var(--text-secondary); font-weight: 500">Relevant Provision</span>
                                <span>Section 436A CrPC / Section 479 BNSS 2023 — undertrial release thresholds</span>
                            </div>
                            <div class="reasoning-item">
                                <span style="color: var(--text-secondary); font-weight: 500">Rule Applied</span>
                                <span>Half-of-maximum-sentence custody threshold check. Custody of ${custodyDays} days compared against ½ of maximum 7-year sentence (1,277 days).</span>
                            </div>
                            <div class="reasoning-item">
                                <span style="color: var(--text-secondary); font-weight: 500">Source</span>
                                <span>CrPC §436A / BNSS §479 (as entered in system database)</span>
                            </div>
                            <div class="reasoning-item">
                                <span style="color: var(--text-secondary); font-weight: 500">Database Version</span>
                                <span>Legal database last verified: system seed data</span>
                            </div>
                            <div class="reasoning-item">
                                <span style="color: var(--text-secondary); font-weight: 500">Confidence Level</span>
                                <span>${badge('Requires Verification', 'warning')} — Verify against current bare Act text and applicable case law</span>
                            </div>
                            ${aiBadge()}
                        </div>
                    </div>

                    <!-- Custody Rules from Database -->
                    <div class="card" style="margin-top: var(--space-6)">
                        <h3 style="margin-bottom: var(--space-4)">${icons.doc} Applicable Custody Rules</h3>
                        <div id="custody-rules-list">
                            <div class="loading-overlay" style="padding: var(--space-6)">
                                <div class="spinner"></div>
                                <span>Loading custody rules...</span>
                            </div>
                        </div>
                    </div>

                    <!-- Procedural Checklist -->
                    <div class="card" style="margin-top: var(--space-6)">
                        <h3 style="margin-bottom: var(--space-4)">${icons.check} Procedural Requirements for Bail</h3>
                        <div id="checklist-items">
                            <div class="loading-overlay" style="padding: var(--space-6)">
                                <div class="spinner"></div>
                                <span>Loading checklist...</span>
                            </div>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div style="display: flex; gap: var(--space-4); flex-wrap: wrap; margin-top: var(--space-6); justify-content: center">
                        <button class="btn btn-primary btn-lg" data-navigate="/lawyer-discovery">${icons.lawyer} Find a Lawyer</button>
                        <button class="btn btn-secondary btn-lg" data-navigate="/case-law-search">${icons.search} Search Related Judgments</button>
                        <button class="btn btn-outline btn-lg" data-navigate="/legal-provisions">${icons.doc} View Legal Provisions</button>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}

export async function init() {
    // Load custody rules from API
    try {
        const { rules } = await api.getCustodyRules();
        const container = document.getElementById('custody-rules-list');
        if (rules && rules.length > 0) {
            container.innerHTML = rules.map(r => `
                <div style="padding: var(--space-4); border-bottom: 1px solid var(--neutral-100)">
                    <div style="font-weight: var(--weight-semibold); margin-bottom: var(--space-1)">${r.rule_name}</div>
                    <div style="font-size: var(--text-sm); color: var(--text-secondary); margin-bottom: var(--space-2)">${r.description}</div>
                    <div style="display: flex; gap: var(--space-3); flex-wrap: wrap; font-size: var(--text-xs)">
                        ${badge(r.source_provision, 'info')}
                        ${badge('Threshold: ' + (r.threshold_fraction * 100) + '%', 'primary')}
                        ${badge('Applies to: ' + r.applies_to, 'neutral')}
                    </div>
                    ${r.exclusion_notes ? `<div style="font-size: var(--text-xs); color: var(--text-tertiary); margin-top: var(--space-2)">${icons.warning} ${r.exclusion_notes}</div>` : ''}
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p style="padding: var(--space-4); color: var(--text-secondary)">No custody rules found in database.</p>';
        }
    } catch (e) {
        document.getElementById('custody-rules-list').innerHTML = '<p style="padding: var(--space-4); color: var(--text-secondary)">Unable to load custody rules.</p>';
    }

    // Load procedural checklist
    try {
        const { items } = await api.getChecklist('general', 'regular');
        const container = document.getElementById('checklist-items');
        if (items && items.length > 0) {
            container.innerHTML = items.map(item => `
                <div style="display: flex; align-items: flex-start; gap: var(--space-3); padding: var(--space-3) 0; border-bottom: 1px solid var(--neutral-100)">
                    <span style="color: ${item.is_mandatory ? 'var(--danger-500)' : 'var(--text-tertiary)'}; flex-shrink: 0">${item.is_mandatory ? '●' : '○'}</span>
                    <div>
                        <span style="font-size: var(--text-sm)">${item.requirement}</span>
                        ${item.is_mandatory ? `<span class="badge badge-danger" style="margin-left: var(--space-2)">Mandatory</span>` : ''}
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p style="padding: var(--space-4); color: var(--text-secondary)">No checklist items found.</p>';
        }
    } catch (e) {
        document.getElementById('checklist-items').innerHTML = '<p style="padding: var(--space-4); color: var(--text-secondary)">Unable to load checklist.</p>';
    }
}
