/**
 * Bail Reckoner — Judicial / Court Dashboard
 */
import { navbar, sidebar, icons, badge, aiBadge, disclaimer, dataTable, statCard } from '../components.js';
import { judicialSidebarItems, sampleCase } from '../data.js';

export function render() {
    const sc = sampleCase;
    return `
    <div class="layout-dashboard">
        ${navbar({ showLinks: false, showRole: true, roleName: 'Judicial Authority' })}
        ${sidebar(judicialSidebarItems, 'dashboard')}
        <div class="page-content animate-fade-in">
            <div class="page-header">
                <div>
                    <h1 class="page-title">Case Dashboard</h1>
                    <p class="page-subtitle">Judicial case information and AI-assisted legal reference.</p>
                </div>
            </div>

            ${disclaimer('AI-Assisted Legal Information — All information below is for reference only. Judicial determination is required for all decisions. Every AI-generated result includes source, legal provision, timestamp, and verification status.')}

            <!-- Case Overview -->
            <div class="card" style="margin-top: var(--space-4); margin-bottom: var(--space-6)">
                <h3 style="margin-bottom: var(--space-4)">Case Overview</h3>
                <div class="grid-cols-3" style="gap: var(--space-4)">
                    <div>
                        <div style="font-size: var(--text-xs); color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px">Case ID</div>
                        <div style="font-weight: 600; margin-top: 4px">${sc.caseId}</div>
                    </div>
                    <div>
                        <div style="font-size: var(--text-xs); color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px">Accused</div>
                        <div style="font-weight: 600; margin-top: 4px">${sc.accused}</div>
                    </div>
                    <div>
                        <div style="font-size: var(--text-xs); color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px">Court</div>
                        <div style="font-weight: 600; margin-top: 4px">${sc.court}</div>
                    </div>
                    <div>
                        <div style="font-size: var(--text-xs); color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px">Case Stage</div>
                        <div style="margin-top: 4px">${badge(sc.stage, 'primary')}</div>
                    </div>
                    <div>
                        <div style="font-size: var(--text-xs); color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px">Custody Duration</div>
                        <div style="font-weight: 600; margin-top: 4px; color: var(--warning-600)">Calculated on load</div>
                    </div>
                    <div>
                        <div style="font-size: var(--text-xs); color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px">Charges</div>
                        <div style="margin-top: 4px">${sc.charges.map(c => badge('§' + c.section, 'neutral')).join(' ')}</div>
                    </div>
                </div>
            </div>

            <!-- Charges -->
            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">Charges</h3>
                </div>
                <div class="card" style="padding: 0; overflow: hidden">
                    ${dataTable({
                        columns: [
                            { label: 'Section', render: r => `<strong>§${r.section} ${r.act}</strong>` },
                            { label: 'BNS', render: r => r.bns ? `§${r.bns}` : '—' },
                            { label: 'Offence', key: 'offence' },
                            { label: 'Punishment', key: 'punishment' },
                            { label: 'Bail', render: r => badge(r.bailable, r.bailable === 'Bailable' ? 'success' : 'warning') },
                        ],
                        rows: sc.charges,
                    })}
                </div>
            </div>

            <!-- Bail Information -->
            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">Bail Information ${aiBadge()}</h3>
                </div>
                <div class="card">
                    <div style="background: var(--info-50); border: 1px solid var(--info-200); border-radius: var(--radius-md); padding: var(--space-4); margin-bottom: var(--space-4)">
                        <div style="font-weight: 600; color: var(--info-700); margin-bottom: var(--space-2)">AI-Assisted Legal Information</div>
                        <div style="font-size: var(--text-sm); color: var(--info-600)">
                            The information below is retrieved from the legal database and statutory provisions. 
                            <strong>Judicial determination is required.</strong> This system does not recommend granting or denying bail.
                        </div>
                    </div>

                    <h4 style="margin-bottom: var(--space-3)">Applicable Statutory Provisions</h4>
                    <div id="judicial-provisions" style="margin-bottom: var(--space-4)">
                        <div style="padding: var(--space-3); border: 1px solid var(--border-light); border-radius: var(--radius-md); margin-bottom: var(--space-2)">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start">
                                <div>
                                    <div style="font-weight: 600">Section 436A CrPC / Section 479 BNSS 2023</div>
                                    <div style="font-size: var(--text-sm); color: var(--text-secondary); margin-top: var(--space-1)">
                                        Undertrial release after serving half of maximum sentence. First-time offender threshold: one-third.
                                    </div>
                                </div>
                                ${aiBadge()}
                            </div>
                            <div style="display: flex; gap: var(--space-2); margin-top: var(--space-3); font-size: var(--text-xs)">
                                ${badge('Source: CrPC/BNSS', 'neutral')}
                                ${badge('DB Version: Seed Data', 'neutral')}
                                ${badge('Requires Verification', 'warning')}
                            </div>
                        </div>
                    </div>

                    <h4 style="margin-bottom: var(--space-3)">Relevant Judgments</h4>
                    <div id="judicial-judgments">
                        <div style="padding: var(--space-3); border: 1px solid var(--border-light); border-radius: var(--radius-md); margin-bottom: var(--space-2)">
                            <div style="font-weight: 600">Hussainara Khatoon v. State of Bihar (1979 AIR 1369)</div>
                            <div style="font-size: var(--text-sm); color: var(--text-secondary); margin-top: var(--space-1)">
                                Prolonged pre-trial detention violates Article 21. Undertrials in custody longer than maximum sentence entitled to release.
                            </div>
                            <div style="display: flex; gap: var(--space-2); margin-top: var(--space-3); font-size: var(--text-xs)">
                                ${badge('Supreme Court', 'primary')}
                                ${badge('1979', 'neutral')}
                                ${aiBadge()}
                            </div>
                        </div>
                    </div>

                    <button class="btn btn-outline" style="margin-top: var(--space-4)" data-navigate="/bail-reckoner">
                        ${icons.scales} View Full Bail Assessment
                    </button>
                </div>
            </div>

            <!-- Audit Information -->
            <div class="card" style="font-size: var(--text-xs); color: var(--text-tertiary); background: var(--neutral-50)">
                <h4 style="margin-bottom: var(--space-2); font-size: var(--text-sm); color: var(--text-secondary)">${icons.lock} Audit Information</h4>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-3)">
                    <div><strong>Last Accessed:</strong> ${new Date().toLocaleString()}</div>
                    <div><strong>Accessed By:</strong> Judicial User</div>
                    <div><strong>Data Source:</strong> Legal Database v1.0</div>
                    <div><strong>AI Model:</strong> Retrieval-based (no outcome prediction)</div>
                </div>
            </div>
        </div>
    </div>`;
}

export function init() {}
