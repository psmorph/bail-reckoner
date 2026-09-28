/**
 * NyaySetu — Bail Assessment Page
 */
import { navbar, icons, badge, aiBadge, disclaimer, accordion, alert } from '../components.js';
import { getRole, getCurrentCase } from '../state.js';
import * as api from '../api.js';

function checklistStorageKey() {
    const caseData = getCurrentCase() || {};
    const input = caseData.input || {};
    const caseId = caseData.case_id || caseData.caseId || caseData.id;
    const fingerprint = caseId || [input.sections, input.specialLaws, input.arrestDate, input.bailType].filter(Boolean).join('-') || 'current';
    return `nyaysetu_checklist_${fingerprint}`;
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[char]);
}

function renderReadinessChecklist(items, container) {
    const key = checklistStorageKey();
    let checked = {};
    try { checked = JSON.parse(localStorage.getItem(key) || '{}'); } catch (_) { /* start fresh if storage is invalid */ }
    const safeItems = items.map((item, index) => ({ ...item, checklistIndex: index }));
    const completed = safeItems.filter(item => checked[item.checklistIndex]).length;
    const progress = safeItems.length ? Math.round(completed / safeItems.length * 100) : 0;

    container.innerHTML = `
        <p style="color: var(--text-secondary); font-size: var(--text-sm); margin-bottom: var(--space-4)">Track what you have gathered. Your progress is saved in this browser for this case.</p>
        <div style="display:flex; justify-content:space-between; align-items:center; gap:var(--space-3); margin-bottom:var(--space-2)">
            <span id="readiness-count" style="font-size:var(--text-sm); font-weight:600">${completed} of ${safeItems.length} complete</span>
            <button type="button" class="btn btn-outline btn-sm" id="copy-readiness-checklist">Copy checklist</button>
        </div>
        <div role="progressbar" aria-label="Checklist progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}" style="height:8px; background:var(--neutral-100); border-radius:999px; overflow:hidden; margin-bottom:var(--space-3)">
            <div id="readiness-progress" style="width:${progress}%; height:100%; background:var(--success-500); transition:width .2s"></div>
        </div>
        ${safeItems.map(item => `
            <label style="display:flex; align-items:flex-start; gap:var(--space-3); padding:var(--space-3) 0; border-bottom:1px solid var(--neutral-100); cursor:pointer">
                <input type="checkbox" data-checklist-index="${item.checklistIndex}" ${checked[item.checklistIndex] ? 'checked' : ''} style="margin-top:3px; accent-color:var(--primary-600)">
                <span style="font-size:var(--text-sm)">${escapeHtml(item.requirement)} ${item.is_mandatory ? '<span class="badge badge-danger" style="margin-left:var(--space-2)">Listed as mandatory</span>' : ''}</span>
            </label>`).join('')}
        <p style="font-size:var(--text-xs); color:var(--text-tertiary); margin-top:var(--space-3)">Checklist items are general prompts from the local reference dataset. Confirm requirements for your court, case, and current law with a lawyer.</p>`;

    const checkboxes = [...container.querySelectorAll('[data-checklist-index]')];
    const updateProgress = () => {
        const state = Object.fromEntries(checkboxes.map(box => [box.dataset.checklistIndex, box.checked]));
        localStorage.setItem(key, JSON.stringify(state));
        const done = checkboxes.filter(box => box.checked).length;
        const percent = checkboxes.length ? Math.round(done / checkboxes.length * 100) : 0;
        container.querySelector('#readiness-count').textContent = `${done} of ${checkboxes.length} complete`;
        container.querySelector('#readiness-progress').style.width = `${percent}%`;
        container.querySelector('[role="progressbar"]').setAttribute('aria-valuenow', percent);
    };
    checkboxes.forEach(box => box.addEventListener('change', updateProgress));
    container.querySelector('#copy-readiness-checklist').addEventListener('click', async event => {
        const button = event.currentTarget;
        const text = [
            'NyaySetu — Bail application preparation checklist',
            ...checkboxes.map(box => `${box.checked ? '[x]' : '[ ]'} ${box.parentElement.querySelector('span').textContent.trim()}`),
            '', 'General information only. Confirm requirements with a qualified lawyer.'
        ].join('\n');
        try {
            await navigator.clipboard.writeText(text);
            button.textContent = 'Copied';
            setTimeout(() => { button.textContent = 'Copy checklist'; }, 1800);
        } catch (_) {
            const field = document.createElement('textarea');
            field.value = text;
            field.style.position = 'fixed'; field.style.opacity = '0';
            document.body.appendChild(field); field.select();
            document.execCommand('copy'); field.remove();
            button.textContent = 'Copied';
        }
    });
}

export function render() {
    const role = getRole();
    const roleName = localStorage.getItem('br_role_name') || 'User';
    const caseData = getCurrentCase();
    const assessment = caseData?.assessment || {};
    const custodyDays = caseData?.custody_days || 0;
    const input = caseData?.input || {};
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
                    <h1 class="page-title">NyaySetu Bail Review</h1>
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
                            <div class="status-title">Review required — no outcome predicted</div>
                            <div class="status-subtitle">NyaySetu surfaces information for human review; it does not determine bail eligibility.</div>
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
                            <div class="ac-row"><span class="ac-label">Bailable / Non-Bailable</span><span class="ac-value">${badge('Verify applicable provision', 'warning')}</span></div>
                            <div class="ac-row"><span class="ac-label">Cognizable</span><span class="ac-value">${badge('Not verified', 'neutral')}</span></div>
                            <div class="ac-row"><span class="ac-label">Compoundable</span><span class="ac-value">${badge('Not verified', 'neutral')}</span></div>
                            <div class="ac-row"><span class="ac-label">Category</span><span class="ac-value">Confirm against the current Act</span></div>
                        </div>

                        <!-- Custody Analysis -->
                        <div class="assessment-card">
                            <div class="ac-title">${icons.clock} Custody Analysis</div>
                            <div class="ac-row"><span class="ac-label">Date of Arrest</span><span class="ac-value">${input.arrestDate || 'Not provided'}</span></div>
                            <div class="ac-row"><span class="ac-label">Current Custody</span><span class="ac-value"><strong>${input.arrestDate ? `${custodyDays} days` : 'Not calculated'}</strong></span></div>
                            <div class="ac-row"><span class="ac-label">Relevant Threshold</span><span class="ac-value">Depends on the applicable statute and case facts</span></div>
                            <div class="ac-row"><span class="ac-label">Threshold Status</span><span class="ac-value">${badge('Requires legal verification', 'warning')}</span></div>
                        </div>

                        <!-- Punishment Information -->
                        <div class="assessment-card">
                            <div class="ac-title">${icons.gavel} Punishment Information</div>
                            <div class="ac-row"><span class="ac-label">Applicable Provision</span><span class="ac-value">Not verified from the current case input</span></div>
                            <div class="ac-row"><span class="ac-label">Punishment range</span><span class="ac-value">Check the current bare Act and amendments</span></div>
                            <div class="ac-row"><span class="ac-label">Custody comparison</span><span class="ac-value">Requires a verified offence and applicable rule</span></div>
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
                        <h3 style="margin-bottom: var(--space-4)">${icons.check} Bail Application Readiness Checklist</h3>
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

    // Load and persist the case-specific preparation checklist
    try {
        const { items } = await api.getChecklist('general', 'regular');
        const container = document.getElementById('checklist-items');
        if (items && items.length > 0) {
            renderReadinessChecklist(items, container);
        } else {
            container.innerHTML = '<p style="padding: var(--space-4); color: var(--text-secondary)">No checklist items found.</p>';
        }
    } catch (e) {
        document.getElementById('checklist-items').innerHTML = '<p style="padding: var(--space-4); color: var(--text-secondary)">Unable to load checklist.</p>';
    }
}
