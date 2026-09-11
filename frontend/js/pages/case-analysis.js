/**
 * Bail Reckoner — AI Case Analysis Dashboard
 */
import { navbar, icons, badge, aiBadge, statCard, accordion, disclaimer, alert, dataTable, caseCard } from '../components.js';
import { getRole, getCurrentCase } from '../state.js';
import { sampleCase } from '../data.js';

export function render() {
    const role = getRole();
    const roleName = localStorage.getItem('br_role_name') || 'User';
    const caseData = getCurrentCase();
    const input = caseData?.input || {};
    const assessment = caseData?.assessment || {};
    const custodyDays = caseData?.custody_days || 0;
    const similarCases = caseData?.similar_cases || [];
    const isPublic = role === 'public';

    // Use sample data for display enrichment
    const sc = sampleCase;

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
                    <button class="btn btn-primary btn-sm" data-navigate="/lawyer-discovery">${icons.lawyer} Find a Lawyer</button>
                </div>
            </div>

            ${disclaimer()}

            <!-- Case Header -->
            <div class="case-header" style="margin-top: var(--space-4)">
                <div>
                    <div class="case-id">${sc.caseId}</div>
                    <div class="case-court">${sc.court}</div>
                </div>
                <div style="display:flex; gap: var(--space-2); align-items: center; flex-wrap: wrap">
                    ${badge(sc.stage, 'primary')}
                    ${badge('Analysis Complete', 'success')}
                    ${aiBadge()}
                </div>
            </div>

            <!-- Summary Stats -->
            <div class="grid-cols-5" style="margin-bottom: var(--space-6)">
                ${statCard({ icon: '📋', value: sc.stage.split('—')[0].trim(), label: 'Case Stage', iconBg: 'var(--primary-50)' })}
                ${statCard({ icon: '🕐', value: `${custodyDays} days`, label: 'Custody Duration', iconBg: 'var(--warning-50)' })}
                ${statCard({ icon: '⚖️', value: sc.charges.length.toString(), label: 'Charges Identified', iconBg: 'var(--danger-50)' })}
                ${statCard({ icon: '📚', value: sc.charges.length.toString(), label: 'Legal Provisions', iconBg: 'var(--info-50)' })}
                ${statCard({ icon: '✅', value: 'Complete', label: 'Analysis Status', iconBg: 'var(--success-50)' })}
            </div>

            <!-- Your Case in Simple Language -->
            <div class="simple-language">
                <div class="sl-title">
                    ${icons.bulb} ${isPublic ? 'Your Case in Simple Language' : 'Case Summary in Plain Language'}
                    ${aiBadge()}
                </div>
                
                ${accordion([
                    { title: `${icons.search} What happened according to the document?`, content: `<p>${sc.simpleSummary.what}</p>` },
                    { title: `${icons.warning} What are you accused of?`, content: `<p>${sc.simpleSummary.accused}</p>` },
                    { title: `${icons.doc} Which laws are involved?`, content: `<p>${sc.simpleSummary.laws}</p>` },
                    { title: `${icons.clock} What could happen next?`, content: `<p>${sc.simpleSummary.next}</p>` },
                    { title: `${icons.lawyer} What should you discuss with your lawyer?`, content: `<p>${sc.simpleSummary.discuss}</p>` },
                ])}
            </div>

            <!-- Charges Identified -->
            <div class="section" style="margin-top: var(--space-6)">
                <div class="section-header">
                    <h3 class="section-title">Charges Identified</h3>
                    ${aiBadge()}
                </div>
                <div class="card" style="padding: 0; overflow: hidden">
                    ${dataTable({
                        columns: [
                            { label: 'Section', render: r => `<strong>§${r.section}</strong>` },
                            { label: 'Act', key: 'act' },
                            { label: 'BNS Equivalent', render: r => r.bns ? `§${r.bns}` : '—' },
                            { label: 'Offence', key: 'offence' },
                            { label: 'Punishment', key: 'punishment' },
                            { label: 'Bail Status', render: r => badge(r.bailable, r.bailable === 'Bailable' ? 'success' : 'warning') },
                            { label: 'Verification', render: r => badge(r.status, r.status === 'Verified' ? 'success' : 'warning') },
                        ],
                        rows: sc.charges,
                    })}
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
                                <span style="font-size: var(--text-sm)">${t}</span>
                            </div>
                        `).join('') :
                        alert('No automated triggers were recorded. This is not a bail decision. All information requires legal verification.', 'info')
                    }
                    <div style="margin-top: var(--space-4); font-size: var(--text-xs); color: var(--text-tertiary)">
                        ${assessment.disclaimer || 'Informational retrieval and issue spotting only. Does not predict, approve, or reject bail.'}
                    </div>
                </div>
            </div>

            <!-- Similar Judgments -->
            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">Similar Judgments Found</h3>
                    <button class="btn btn-outline btn-sm" data-navigate="/case-law-search">View All ${icons.arrow}</button>
                </div>
                ${similarCases.length > 0 ? `
                    <div style="display: grid; gap: var(--space-4)">
                        ${similarCases.map(c => caseCard({
                            title: c.case_title || c.case_name || 'Case',
                            court: c.court || '',
                            date: c.date || '',
                            bailType: c.bail_type || '',
                            outcome: c.bail_outcome || '',
                            sections: c.ipc_sections || '',
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
}
