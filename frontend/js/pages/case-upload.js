/**
 * Bail Reckoner — Case Upload & Analysis Page
 */
import { navbar, icons, uploadZone, stepProgress, alert, badge, disclaimer, aiBadge, showToast } from '../components.js';
import { getRole, setCurrentCase } from '../state.js';
import * as api from '../api.js';

let analysisState = 'upload'; // 'upload' | 'form' | 'analyzing' | 'done'

export function render() {
    const role = getRole();
    const roleName = localStorage.getItem('br_role_name') || 'User';

    return `
    <div class="layout-app">
        ${navbar({ showLinks: false, showRole: true, roleName })}
        <div class="page-content animate-fade-in">
            <div class="page-header">
                <div>
                    <div class="page-breadcrumb">
                        <span class="breadcrumb-link" data-navigate="/purpose">Home</span>
                        <span class="breadcrumb-sep">›</span>
                        <span>Analyze Your Case</span>
                    </div>
                    <h1 class="page-title">Analyze Your Case</h1>
                    <p class="page-subtitle">Enter case details or upload documents for AI-assisted analysis.</p>
                </div>
            </div>

            ${disclaimer()}

            <!-- Upload Section -->
            <div class="upload-page" style="margin-top: var(--space-6)">
                <div class="upload-container">
                    ${uploadZone('case-file')}
                    
                    <div class="divider-text" style="margin: var(--space-6) 0">Or enter case details manually</div>
                    
                    <!-- Manual Input Form -->
                    <div class="card" id="case-form-card">
                        <h3 style="margin-bottom: var(--space-5)">Case Details</h3>
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">IPC/BNS Sections</label>
                                <input type="text" class="form-input" id="inp-sections" placeholder="e.g., 302, 34 or 420, 468" value="420, 468, 471">
                                <span class="form-hint">Comma-separated section numbers</span>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Special-Law Sections</label>
                                <input type="text" class="form-input" id="inp-special" placeholder="e.g., POCSO 6; NDPS 20">
                                <span class="form-hint">Act name and section</span>
                            </div>
                        </div>
                        <div class="form-row" style="margin-top: var(--space-4)">
                            <div class="form-group">
                                <label class="form-label">Bail Type</label>
                                <select class="form-select" id="inp-bail-type">
                                    <option value="Regular">Regular Bail</option>
                                    <option value="Anticipatory">Anticipatory Bail</option>
                                    <option value="Default/statutory">Default / Statutory Bail</option>
                                    <option value="Interim">Interim Bail</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Arrest Date</label>
                                <input type="date" class="form-input" id="inp-arrest" value="2025-03-14">
                            </div>
                        </div>
                        <div class="form-row" style="margin-top: var(--space-4)">
                            <div class="form-group">
                                <label class="form-checkbox-group">
                                    <input type="checkbox" class="form-checkbox" id="inp-chargesheet"> Charge sheet filed
                                </label>
                            </div>
                            <div class="form-group">
                                <label class="form-checkbox-group">
                                    <input type="checkbox" class="form-checkbox" id="inp-firsttime" checked> First-time offender
                                </label>
                            </div>
                        </div>
                        <div style="margin-top: var(--space-4)">
                            <label class="form-label">Risk Factors (if recorded)</label>
                            <div style="display: flex; gap: var(--space-6); margin-top: var(--space-2)">
                                <label class="form-checkbox-group">
                                    <input type="checkbox" class="form-checkbox" id="inp-flight"> Flight risk
                                </label>
                                <label class="form-checkbox-group">
                                    <input type="checkbox" class="form-checkbox" id="inp-witness"> Witness risk
                                </label>
                                <label class="form-checkbox-group">
                                    <input type="checkbox" class="form-checkbox" id="inp-evidence"> Evidence risk
                                </label>
                            </div>
                        </div>
                        <div class="form-group" style="margin-top: var(--space-4)">
                            <label class="form-label">Case Facts and Legal Issues</label>
                            <textarea class="form-textarea" id="inp-facts" rows="4" placeholder="Describe the case facts, legal issues, and any relevant context...">Accused is charged with cheating and forgery. The complainant alleges financial fraud through forged documents. The accused is a first-time offender with no prior criminal record and has been in custody since March 2025.</textarea>
                        </div>
                        <button class="btn btn-primary btn-lg w-full" style="margin-top: var(--space-6)" id="analyze-btn">
                            ${icons.search} Start Analysis
                        </button>
                    </div>
                </div>
            </div>

            <!-- Analysis Progress -->
            <div id="analysis-progress" style="display:none">
                <div class="analysis-progress">
                    <div class="card" style="text-align: center; padding: var(--space-10)">
                        <div class="spinner spinner-lg" style="margin: 0 auto var(--space-6)"></div>
                        <h3 style="margin-bottom: var(--space-2)">Analyzing Your Case</h3>
                        <p style="color: var(--text-secondary); margin-bottom: var(--space-8)">Please wait while we process your case information...</p>
                        <div id="analysis-steps"></div>
                    </div>
                </div>
            </div>

            <!-- Results (shown after analysis) -->
            <div id="analysis-results" style="display:none"></div>
        </div>
    </div>`;
}

const analysisSteps = [
    'Reading case information',
    'Extracting details and charges',
    'Identifying legal provisions',
    'Mapping applicable statutes',
    'Checking bail-related provisions',
    'Preparing case summary',
];

export function init() {
    // Upload zone interactions
    const zone = document.getElementById('case-file-zone');
    const fileInput = document.getElementById('case-file');
    
    if (zone) {
        zone.addEventListener('click', () => fileInput.click());
        zone.addEventListener('dragover', e => {
            e.preventDefault();
            zone.classList.add('dragover');
        });
        zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
        zone.addEventListener('drop', e => {
            e.preventDefault();
            zone.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
        });
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) handleFile(fileInput.files[0]);
        });
    }

    // Analyze button
    document.getElementById('analyze-btn')?.addEventListener('click', runAnalysis);
}

function handleFile(file) {
    const zone = document.getElementById('case-file-zone');
    zone.innerHTML = `
        <div style="font-size: 36px">📄</div>
        <div class="upload-title">${file.name}</div>
        <div class="upload-hint">${(file.size / 1024).toFixed(1)} KB • ${file.type || 'Document'}</div>
        <div style="margin-top: var(--space-3)">${badge('File Ready', 'success')}</div>
    `;
    showToast('Document uploaded successfully. Fill in additional details below.', 'success');
}

async function runAnalysis() {
    const sections = document.getElementById('inp-sections')?.value || '';
    const specialLaws = document.getElementById('inp-special')?.value || '';
    const bailType = document.getElementById('inp-bail-type')?.value || 'Regular';
    const arrestDate = document.getElementById('inp-arrest')?.value || '';
    const chargeSheet = document.getElementById('inp-chargesheet')?.checked || false;
    const firstTime = document.getElementById('inp-firsttime')?.checked || true;
    const flight = document.getElementById('inp-flight')?.checked || false;
    const witness = document.getElementById('inp-witness')?.checked || false;
    const evidence = document.getElementById('inp-evidence')?.checked || false;
    const facts = document.getElementById('inp-facts')?.value || '';

    if (!sections && !facts) {
        showToast('Please enter case sections or facts to analyze.', 'warning');
        return;
    }

    // Show progress
    document.querySelector('.upload-page').style.display = 'none';
    const progress = document.getElementById('analysis-progress');
    progress.style.display = 'block';
    progress.scrollIntoView({ behavior: 'smooth' });

    // Animate steps
    const stepsContainer = document.getElementById('analysis-steps');
    for (let i = 0; i < analysisSteps.length; i++) {
        stepsContainer.innerHTML = analysisSteps.map((step, j) => `
            <div class="analysis-step ${j < i ? 'done' : j === i ? 'active' : 'pending'}">
                <div class="step-icon">${j < i ? '✓' : j === i ? '<div class="spinner"></div>' : (j + 1)}</div>
                <div class="step-text">${step}</div>
            </div>
        `).join('');
        await delay(600);
    }

    // Call API
    try {
        const result = await api.reviewCase({
            sections,
            special_laws: specialLaws,
            bail_type: bailType,
            arrest_date: arrestDate,
            charge_sheet_filed: chargeSheet,
            first_time_offender: firstTime,
            flight_risk: flight,
            witness_risk: witness,
            evidence_risk: evidence,
            case_facts: facts,
            top_k: 5,
        });

        // Store result
        setCurrentCase({
            ...result,
            input: { sections, specialLaws, bailType, arrestDate, chargeSheet, firstTime, flight, witness, evidence, facts },
        });

        // Show done
        stepsContainer.innerHTML = analysisSteps.map((step) => `
            <div class="analysis-step done">
                <div class="step-icon">✓</div>
                <div class="step-text">${step}</div>
            </div>
        `).join('');

        await delay(500);

        // Redirect to analysis results
        window.location.hash = '#/case-analysis';

    } catch (err) {
        showToast('Analysis failed: ' + err.message + '. Showing with available data.', 'warning');
        // Store partial result
        setCurrentCase({
            custody_days: 0,
            assessment: { status: 'Review required', triggers: ['Unable to complete full analysis. Please verify input data.'], disclaimer: 'Informational only.' },
            similar_cases: [],
            input: { sections, specialLaws, bailType, arrestDate, chargeSheet, firstTime, flight, witness, evidence, facts },
        });
        await delay(500);
        window.location.hash = '#/case-analysis';
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
