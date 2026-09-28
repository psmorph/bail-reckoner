/**
 * NyaySetu — AI Case Analysis Dashboard
 */
import { navbar, icons, badge, aiBadge, statCard, accordion, disclaimer, alert, caseCard } from '../components.js';
import { getCurrentCase } from '../state.js';

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[char]);
}

export function render() {
    const roleName = localStorage.getItem('br_role_name') || 'User';
    const caseData = getCurrentCase();
    const input = caseData?.input || {};
    const assessment = caseData?.assessment || {};
    const custodyDays = caseData?.custody_days || 0;
    const similarCases = caseData?.similar_cases || [];
    const analysisError = caseData?.analysis_error || '';
    const submittedFacts = input.facts?.trim() || '';
    const sectionCount = input.sections ? input.sections.split(/[,;]+/).map(value => value.trim()).filter(Boolean).length : 0;

    return `
    <div class="layout-app">
        ${navbar({ showLinks: false, showRole: true, roleName })}
        <div class="page-content animate-fade-in">
            <div class="page-header">
                <div>
                    <div class="page-breadcrumb">
                        <span class="breadcrumb-link" data-navigate="/purpose">Home</span>
                        <span class="breadcrumb-sep">›</span>
                        <span class="breadcrumb-link" data-navigate="/case-upload">Case Upload</span>
                        <span class="breadcrumb-sep">›</span>
                        <span>Case Analysis</span>
                    </div>
                    <h1 class="page-title">Case Analysis ${aiBadge()}</h1>
                </div>
                <div class="page-actions">
                    <button class="btn btn-outline btn-sm" data-navigate="/bail-reckoner">${icons.scales} View Bail Assessment</button>
                    <button class="btn btn-secondary btn-sm" id="download-case-brief">${icons.download} Download Case Brief</button>
                    <button class="btn btn-primary btn-sm" data-navigate="/lawyer-discovery">${icons.lawyer} Find a Lawyer</button>
                </div>
            </div>

            ${disclaimer()}

            <!-- Case Header -->
            <div class="case-header" style="margin-top: var(--space-4)">
                <div>
                    <div class="case-id">NyaySetu case review</div>
                    <div class="case-court">Court details were not provided</div>
                </div>
                <div style="display:flex; gap: var(--space-2); align-items: center; flex-wrap: wrap">
                    ${badge('Based on submitted details', 'primary')}
                    ${badge(analysisError ? 'Review service unavailable' : 'Review complete', analysisError ? 'warning' : 'success')}
                    ${aiBadge()}
                </div>
            </div>

            ${analysisError ? alert(`Automated review could not be completed: ${escapeHtml(analysisError)}. The information below is what you submitted; no similar judgments or automated review result is available.`, 'warning', 'Review service unavailable') : ''}

            <!-- Summary Stats -->
            <div class="grid-cols-5" style="margin-bottom: var(--space-6)">
                ${statCard({ icon: '📋', value: escapeHtml(input.bailType || 'Not entered'), label: 'Bail type entered', iconBg: 'var(--primary-50)' })}
                ${statCard({ icon: '🕐', value: input.arrestDate ? `${custodyDays} days` : 'Not calculated', label: 'Custody duration', iconBg: 'var(--warning-50)' })}
                ${statCard({ icon: '⚖️', value: sectionCount.toString(), label: 'Section entries supplied', iconBg: 'var(--danger-50)' })}
                ${statCard({ icon: '📚', value: similarCases.length.toString(), label: 'Similar judgments found', iconBg: 'var(--info-50)' })}
                ${statCard({ icon: '✅', value: analysisError ? 'Unavailable' : 'Ready for review', label: 'Review status', iconBg: 'var(--success-50)' })}
            </div>

            <!-- Submitted information and discussion prompts -->
            <div class="simple-language">
                <div class="sl-title">
                    ${icons.bulb} Information to review with your lawyer
                </div>
                ${accordion([
                    { title: `${icons.doc} Facts entered or extracted from your document`, content: `<p style="white-space:pre-wrap; overflow-wrap:anywhere">${escapeHtml(submittedFacts || 'No case facts were provided.')}</p>` },
                    { title: `${icons.scales} Sections and special laws you entered`, content: `<p>Sections: ${escapeHtml(input.sections || 'Not provided')}</p><p>Special-law sections: ${escapeHtml(input.specialLaws || 'Not provided')}</p><p>These entries have not been independently verified against the current law.</p>` },
                    { title: `${icons.lawyer} Questions to discuss with a lawyer`, content: '<ul><li>Which current statutory provisions apply to the facts and dates in the official record?</li><li>Are there special-statute requirements or previous court orders to consider?</li><li>Which documents and upcoming court dates should be confirmed?</li></ul>' },
                ])}
            </div>

            <!-- Case information supplied by the user -->
            <div class="section" style="margin-top: var(--space-6)">
                <div class="section-header">
                    <h3 class="section-title">Details supplied for review</h3>
                </div>
                <div class="card">
                    <div class="ac-row"><span class="ac-label">Bail type</span><span class="ac-value">${escapeHtml(input.bailType || 'Not provided')}</span></div>
                    <div class="ac-row"><span class="ac-label">Arrest date</span><span class="ac-value">${escapeHtml(input.arrestDate || 'Not provided')}</span></div>
                    <div class="ac-row"><span class="ac-label">Charge sheet filed</span><span class="ac-value">${input.chargeSheet ? 'Confirmed in submitted details' : 'Not confirmed'}</span></div>
                    <div class="ac-row"><span class="ac-label">First-time offender</span><span class="ac-value">${input.firstTime ? 'Reported in submitted details' : 'Not reported'}</span></div>
                    <p style="font-size:var(--text-xs); color:var(--text-tertiary); margin-top:var(--space-4)">These details are user-entered or extracted text. NyaySetu has not verified them against official court records.</p>
                </div>
            </div>

            <!-- Rule-Based Review Triggers -->
            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">Rule-Based Review Triggers</h3>
                    ${aiBadge()}
                </div>
                <div class="card">
                    ${assessment.triggers && assessment.triggers.length > 0 ? 
                        assessment.triggers.map(t => `
                            <div style="display: flex; align-items: flex-start; gap: var(--space-3); padding: var(--space-3) 0; border-bottom: 1px solid var(--neutral-100)">
                                <span style="color: var(--warning-500); font-size: 18px; flex-shrink: 0">⚠</span>
                                <span style="font-size: var(--text-sm)">${escapeHtml(t)}</span>
                            </div>
                        `).join('') :
                        alert('No automated triggers were recorded. This is not a bail decision. All information requires legal verification.', 'info')
                    }
                    <div style="margin-top: var(--space-4); font-size: var(--text-xs); color: var(--text-tertiary)">
                        ${escapeHtml(assessment.disclaimer || 'Informational retrieval and issue spotting only. Does not predict, approve, or reject bail.')}
                    </div>
                </div>
            </div>

            <!-- Similar Judgments -->
            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">Similar Judgments Found</h3>
                    <button class="btn btn-outline btn-sm" data-navigate="/case-law-search">View All ${icons.arrow}</button>
                </div>
                <p style="font-size:var(--text-xs); color:var(--text-tertiary); margin-bottom:var(--space-3)">Similarity is a search aid, not a measure of legal relevance or a prediction. Open and verify each judgment from an authoritative source.</p>
                ${similarCases.length > 0 ? `
                    <div style="display: grid; gap: var(--space-4)">
                        ${similarCases.map(c => caseCard({
                            title: escapeHtml(c.case_title || c.case_name || 'Case'),
                            court: escapeHtml(c.court || ''),
                            date: escapeHtml(c.date || ''),
                            bailType: escapeHtml(c.bail_type || ''),
                            outcome: escapeHtml(c.bail_outcome || ''),
                            sections: escapeHtml(c.ipc_sections || ''),
                            similarity: c.similarity,
                        })).join('')}
                    </div>
                ` : `
                    <div class="card" style="text-align: center; padding: var(--space-8)">
                        <p style="color: var(--text-secondary)">No similar judgments found in the database. Try refining your case description or search separately.</p>
                        <button class="btn btn-outline" style="margin-top: var(--space-4)" data-navigate="/case-law-search">Search Case Law</button>
                    </div>
                `}
            </div>

            <!-- Action Buttons -->
            <div class="card" style="display: flex; gap: var(--space-4); flex-wrap: wrap; justify-content: center; padding: var(--space-8)">
                <button class="btn btn-primary btn-lg" data-navigate="/bail-reckoner">${icons.scales} View Bail Assessment</button>
                <button class="btn btn-secondary btn-lg" data-navigate="/lawyer-discovery">${icons.lawyer} Find a Lawyer</button>
                <button class="btn btn-secondary btn-lg" data-navigate="/legal-provisions">${icons.doc} View Legal Provisions</button>
                <button class="btn btn-outline btn-lg" data-navigate="/case-timeline">${icons.clock} Case Timeline</button>
            </div>
        </div>
    </div>`;
}

export function init() {
    // Open first accordion by default
    const firstAcc = document.querySelector('.accordion-item');
    if (firstAcc) firstAcc.classList.add('open');

    document.getElementById('download-case-brief')?.addEventListener('click', () => {
        const current = getCurrentCase() || {};
        const caseInput = current.input || {};
        const triggers = current.assessment?.triggers || [];
        const judgments = current.similar_cases || [];
        const lines = [
            'NYAYSETU — CASE REVIEW BRIEF',
            `Generated: ${new Date().toLocaleString()}`,
            '',
            'CASE INFORMATION',
            `Sections: ${caseInput.sections || 'Not provided'}`,
            `Special laws: ${caseInput.specialLaws || 'Not provided'}`,
            `Bail type: ${caseInput.bailType || 'Not provided'}`,
            `Arrest date: ${caseInput.arrestDate || 'Not provided'}`,
            `Charge sheet filed: ${caseInput.chargeSheet ? 'Yes' : 'Not confirmed'}`,
            `Custody duration recorded by system: ${caseInput.arrestDate ? `${current.custody_days ?? 0} days` : 'Not calculated'}`,
            '',
            'CASE FACTS PROVIDED',
            caseInput.facts || 'No case facts provided.',
            '',
            'REVIEW TRIGGERS',
            ...(triggers.length ? triggers.map((trigger, index) => `${index + 1}. ${trigger}`) : ['No triggers recorded.']),
            '',
            'SIMILAR JUDGMENTS FOR HUMAN REVIEW',
            ...(judgments.length ? judgments.map((judgment, index) => `${index + 1}. ${judgment.case_title || judgment.case_name || 'Untitled case'} | ${judgment.court || 'Court not listed'} | ${judgment.date || 'Date not listed'} | similarity ${judgment.similarity ?? 'not scored'}`) : ['No similar judgments were returned.']),
            '',
            'IMPORTANT: NyaySetu provides legal information and research support only. This brief is not legal advice, a bail prediction, or a court decision. Check every fact, provision, and source against current authoritative records with a qualified lawyer.'
        ];
        const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `nyaysetu-case-brief-${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
}
