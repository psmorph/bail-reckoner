/**
 * Bail Reckoner — Landing Page
 */
import { navbar, icons, featureCard, disclaimer } from '../components.js';

export function render() {
    return `
    <div class="landing-page">
        ${navbar({ transparent: true, showLinks: true })}
        
        <!-- Hero Section -->
        <section class="landing-hero">
            <div class="hero-content">
                <div class="hero-text animate-fade-in">
                    <div class="hero-badge">${icons.scales} AI-Assisted Legal Intelligence Platform</div>
                    <h1>Making Bail Information <span class="highlight">Easier to Understand.</span></h1>
                    <p class="hero-subtitle">
                        An AI-assisted legal intelligence platform that helps users understand criminal-case documents, 
                        identify relevant legal provisions, assess potential bail eligibility, and connect with legal professionals.
                    </p>
                    <div class="hero-ctas">
                        <button class="btn btn-primary btn-xl" data-navigate="/case-upload">
                            ${icons.search} Analyze a Case
                        </button>
                        <button class="btn btn-secondary btn-xl" data-scroll="how-it-works">
                            How It Works ${icons.arrow}
                        </button>
                    </div>
                    <div class="hero-disclaimer">
                        ${icons.warning} AI-generated information is for assistance and must be verified against applicable law and official court records.
                    </div>
                </div>
                <div class="hero-visual animate-slide-up">
                    ${dashboardPreview()}
                </div>
            </div>
        </section>

        <!-- Stakeholder Cards -->
        <section class="landing-section" id="stakeholders">
            <div class="landing-section">
                <div class="section-eyebrow">Who It's For</div>
                <h2 class="section-heading">Built for Every Stakeholder</h2>
                <p class="section-desc">Designed to serve all participants in the Indian criminal justice system with role-specific tools and information.</p>
                <div class="stakeholder-cards">
                    <div class="stakeholder-card" data-navigate="/login">
                        <div class="s-icon">👨‍👩‍👧</div>
                        <div class="s-title">For Accused & Families</div>
                        <div class="s-desc">Understand your case, check bail information, track proceedings, and connect with lawyers — in simple language.</div>
                    </div>
                    <div class="stakeholder-card" data-navigate="/login">
                        <div class="s-icon">👨‍⚖️</div>
                        <div class="s-title">For Lawyers</div>
                        <div class="s-desc">Manage cases, analyze charge sheets, research provisions, find relevant precedents, and assist clients efficiently.</div>
                    </div>
                    <div class="stakeholder-card" data-navigate="/login">
                        <div class="s-icon">👮</div>
                        <div class="s-title">For Police & Officials</div>
                        <div class="s-desc">Upload case documents, generate structured summaries, track proceedings, and manage case workflows.</div>
                    </div>
                    <div class="stakeholder-card" data-navigate="/login">
                        <div class="s-icon">🏛️</div>
                        <div class="s-title">For Judicial Authorities</div>
                        <div class="s-desc">Access AI-assisted legal information, review statutory provisions, and reference relevant judgments alongside case details.</div>
                    </div>
                </div>
            </div>
        </section>

        <!-- How It Works -->
        <section class="landing-section alt" id="how-it-works">
            <div class="section-eyebrow">Process</div>
            <h2 class="section-heading">How It Works</h2>
            <p class="section-desc">From document upload to actionable insights — a transparent, explainable process.</p>
            <div class="how-steps">
                <div class="how-step">
                    <div class="step-num">1</div>
                    <div class="step-text"><strong>Upload Documents</strong><br>FIR, charge sheet, court order</div>
                </div>
                <div class="how-step">
                    <div class="step-num">2</div>
                    <div class="step-text"><strong>AI Extracts Info</strong><br>Case details, charges, dates</div>
                </div>
                <div class="how-step">
                    <div class="step-num">3</div>
                    <div class="step-text"><strong>Maps Provisions</strong><br>Applicable legal sections</div>
                </div>
                <div class="how-step">
                    <div class="step-num">4</div>
                    <div class="step-text"><strong>Bail Assessment</strong><br>Rule-based eligibility review</div>
                </div>
                <div class="how-step">
                    <div class="step-num">5</div>
                    <div class="step-text"><strong>Explainable Results</strong><br>Transparent reasoning & sources</div>
                </div>
                <div class="how-step">
                    <div class="step-num">6</div>
                    <div class="step-text"><strong>Legal Assistance</strong><br>Connect with relevant lawyers</div>
                </div>
            </div>
        </section>

        <!-- Features -->
        <section class="landing-section" id="features">
            <div class="section-eyebrow">Platform Features</div>
            <h2 class="section-heading">Comprehensive Legal Intelligence</h2>
            <p class="section-desc">Everything you need to understand, analyze, and navigate the bail process.</p>
            <div class="grid-cols-3" style="max-width: 1000px; margin: 0 auto">
                ${featureCard({ icon: '📄', iconBg: 'var(--primary-50)', title: 'Document Analysis', description: 'Upload and analyze FIRs, charge sheets, and court orders with AI-powered extraction.', route: '/case-upload' })}
                ${featureCard({ icon: '⚖️', iconBg: 'var(--success-50)', title: 'Bail Assessment', description: 'Rule-based eligibility screening against applicable statutory provisions.', route: '/bail-reckoner' })}
                ${featureCard({ icon: '📚', iconBg: 'var(--info-50)', title: 'Legal Database', description: 'Searchable database of IPC/BNS offences, punishments, and bail classifications.', route: '/legal-provisions' })}
                ${featureCard({ icon: '🔍', iconBg: 'var(--warning-50)', title: 'Case Law Search', description: 'Find relevant judgments and precedents with AI-powered semantic search.', route: '/case-law-search' })}
                ${featureCard({ icon: '👨‍⚖️', iconBg: 'var(--primary-50)', title: 'Lawyer Matching', description: 'Connect with relevant lawyers based on jurisdiction, expertise, and case type.', route: '/lawyer-discovery' })}
                ${featureCard({ icon: '🕐', iconBg: 'var(--neutral-100)', title: 'Case Timeline', description: 'Visual chronological view of all case events, dates, and custody duration.', route: '/case-timeline' })}
            </div>
        </section>

        <!-- Trust & Transparency -->
        <section class="landing-section alt" id="trust">
            <div style="max-width: 700px; margin: 0 auto; text-align: center">
                <div class="section-eyebrow">Trust & Transparency</div>
                <h2 class="section-heading">A Decision-Support Tool, Not a Decision-Maker</h2>
                <p class="section-desc" style="margin-bottom: var(--space-6)">
                    Bail Reckoner is designed as an information-retrieval and analysis platform. 
                    It does not predict outcomes, guarantee bail, or replace the judgment of legal professionals and courts.
                </p>
                ${disclaimer()}
                <div style="display: flex; justify-content: center; gap: var(--space-8); margin-top: var(--space-8); flex-wrap: wrap">
                    <div style="text-align: center">
                        <div style="font-size: 28px; margin-bottom: var(--space-2)">${icons.ai}</div>
                        <div style="font-weight: 600; margin-bottom: 4px">AI Transparency</div>
                        <div style="font-size: var(--text-sm); color: var(--text-secondary); max-width: 180px">Every AI result is clearly labeled with source and confidence</div>
                    </div>
                    <div style="text-align: center">
                        <div style="font-size: 28px; margin-bottom: var(--space-2)">${icons.lock}</div>
                        <div style="font-weight: 600; margin-bottom: 4px">Data Security</div>
                        <div style="font-size: var(--text-sm); color: var(--text-secondary); max-width: 180px">Role-based access with audit trails and confidential markers</div>
                    </div>
                    <div style="text-align: center">
                        <div style="font-size: 28px; margin-bottom: var(--space-2)">${icons.verified}</div>
                        <div style="font-weight: 600; margin-bottom: 4px">Source Verification</div>
                        <div style="font-size: var(--text-sm); color: var(--text-secondary); max-width: 180px">Legal provisions linked to authoritative source material</div>
                    </div>
                </div>
            </div>
        </section>

        <!-- CTA -->
        <section class="landing-section" style="text-align: center">
            <h2 class="section-heading">Ready to Get Started?</h2>
            <p class="section-desc">Understand your case. Know your rights. Navigate the bail process.</p>
            <div style="display: flex; gap: var(--space-4); justify-content: center; flex-wrap: wrap">
                <button class="btn btn-primary btn-xl" data-navigate="/login">Get Started Free</button>
                <button class="btn btn-outline btn-xl" data-navigate="/legal-provisions">Explore Legal Database</button>
            </div>
        </section>

        <!-- Footer -->
        <footer class="landing-footer">
            <div class="footer-grid">
                <div class="footer-brand">
                    <div class="footer-logo">${icons.scales} BAIL RECKONER</div>
                    <p class="footer-tagline">Understand your case. Know your rights. Navigate the bail process.</p>
                    <p class="footer-tagline" style="margin-top: var(--space-4); font-size: 11px; opacity: 0.6">
                        This platform provides AI-assisted legal information retrieval. It does not constitute legal advice. 
                        Verify all information with qualified legal professionals and official court records.
                    </p>
                </div>
                <div class="footer-col">
                    <div class="footer-heading">Platform</div>
                    <a class="footer-link" data-navigate="/case-upload">Analyze a Case</a>
                    <a class="footer-link" data-navigate="/legal-provisions">Legal Database</a>
                    <a class="footer-link" data-navigate="/case-law-search">Case Law Search</a>
                    <a class="footer-link" data-navigate="/lawyer-discovery">Find a Lawyer</a>
                    <a class="footer-link" data-navigate="/legal-aid">Legal Aid</a>
                </div>
                <div class="footer-col">
                    <div class="footer-heading">For Users</div>
                    <a class="footer-link" data-navigate="/login">Login</a>
                    <a class="footer-link" data-navigate="/login">Register</a>
                    <a class="footer-link" href="#">Help & Support</a>
                    <a class="footer-link" href="#">Privacy Policy</a>
                    <a class="footer-link" href="#">Terms of Service</a>
                </div>
                <div class="footer-col">
                    <div class="footer-heading">Resources</div>
                    <a class="footer-link" href="#">About Bail in India</a>
                    <a class="footer-link" href="#">Know Your Rights</a>
                    <a class="footer-link" href="#">Legal Glossary</a>
                    <a class="footer-link" href="#">Contact Us</a>
                </div>
            </div>
            <div class="footer-bottom">
                <span>© 2025 Bail Reckoner. An AI-assisted legal intelligence initiative.</span>
                <span>Not legal advice • Verify all information • ${icons.lock} Secure platform</span>
            </div>
        </footer>
    </div>`;
}

function dashboardPreview() {
    return `
    <div class="dashboard-preview">
        <div class="preview-header">
            <span class="preview-dot red"></span>
            <span class="preview-dot yellow"></span>
            <span class="preview-dot green"></span>
            <span class="preview-title">Case Analysis — FIR/2025/DL/004521</span>
        </div>
        <div class="preview-stats">
            <div class="preview-stat">
                <div class="p-label">Case Stage</div>
                <div class="p-value" style="color: var(--primary-600)">Pre-Trial</div>
            </div>
            <div class="preview-stat">
                <div class="p-label">Custody</div>
                <div class="p-value">87 days</div>
            </div>
            <div class="preview-stat">
                <div class="p-label">Charges</div>
                <div class="p-value">3 sections</div>
            </div>
        </div>
        <div class="preview-charges" style="font-size: 11px; color: var(--text-secondary)">
            <div style="font-weight: 600; margin-bottom: 6px; color: var(--text-primary)">Charges Identified</div>
            <div class="preview-charge-row">
                <span>§420 IPC — Cheating</span>
                <span class="badge badge-warning" style="font-size:9px; padding:2px 6px">Non-Bailable</span>
            </div>
            <div class="preview-charge-row">
                <span>§468 IPC — Forgery</span>
                <span class="badge badge-warning" style="font-size:9px; padding:2px 6px">Non-Bailable</span>
            </div>
            <div class="preview-charge-row">
                <span>§471 IPC — Forged Document</span>
                <span class="badge badge-warning" style="font-size:9px; padding:2px 6px">Non-Bailable</span>
            </div>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; padding: 8px 12px; background: var(--warning-50); border-radius: var(--radius-md); font-size: 10px">
            <span style="font-weight:600; color: var(--warning-700)">⚠ Potentially Eligible — Legal Review Required</span>
        </div>
        <div class="preview-timeline" style="margin-top: var(--space-3)">
            <span class="preview-timeline-dot"></span>
            <span class="preview-timeline-line"></span>
            <span class="preview-timeline-dot" style="background: var(--neutral-300)"></span>
            <span style="font-size: 10px; color: var(--text-tertiary)">87 days in custody</span>
        </div>
    </div>`;
}

export function init() {
    // Smooth scroll for "How It Works" etc
    document.querySelectorAll('[data-scroll]').forEach(el => {
        el.addEventListener('click', () => {
            const target = document.getElementById(el.dataset.scroll);
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
}
