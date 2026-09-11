/**
 * Bail Reckoner — Lawyer Discovery / Matching Page
 */
import { navbar, icons, badge } from '../components.js';
import { getRole } from '../state.js';
import { sampleLawyers } from '../data.js';

export function render() {
    const role = getRole();
    const roleName = localStorage.getItem('br_role_name') || 'User';
    return `
    <div class="layout-app">
        ${navbar({ showLinks: false, showRole: true, roleName })}
        <div class="page-content animate-fade-in">
            <div class="page-header">
                <div>
                    <h1 class="page-title">Find a Lawyer for Your Case</h1>
                    <p class="page-subtitle">Discover lawyers matched to your case based on jurisdiction, expertise, and experience.</p>
                </div>
            </div>

            <div class="alert alert-info" style="margin-bottom: var(--space-6)">
                <span class="alert-icon">${icons.info}</span>
                <div class="alert-content">
                    Lawyer profiles are shown based on publicly available professional information. This does not guarantee outcomes or constitute an endorsement.
                </div>
            </div>

            <!-- Matching Criteria -->
            <div class="card" style="margin-bottom: var(--space-6)">
                <h3 style="margin-bottom: var(--space-4)">Case-Based Matching Criteria</h3>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Court</label>
                        <select class="form-select"><option>Any Court</option><option>Delhi High Court</option><option>Patiala House Court</option><option>Bombay High Court</option></select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Jurisdiction</label>
                        <select class="form-select"><option>Any</option><option>New Delhi</option><option>Mumbai</option><option>Bangalore</option></select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Case Category</label>
                        <select class="form-select"><option>Criminal Law</option><option>Economic Offences</option><option>Cyber Crime</option><option>NDPS</option></select>
                    </div>
                </div>
                <div class="form-row" style="margin-top: var(--space-4)">
                    <div class="form-group">
                        <label class="form-label">Language</label>
                        <select class="form-select"><option>Any</option><option>English</option><option>Hindi</option><option>Marathi</option></select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Experience</label>
                        <select class="form-select"><option>Any</option><option>5+ years</option><option>10+ years</option><option>15+ years</option></select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Availability</label>
                        <select class="form-select"><option>Any</option><option>Available Now</option><option>This Week</option></select>
                    </div>
                </div>
                <button class="btn btn-primary" style="margin-top: var(--space-4)">${icons.search} Find Lawyers</button>
            </div>

            <!-- Results -->
            <div style="margin-bottom: var(--space-4); font-size: var(--text-sm); color: var(--text-secondary)">
                Showing <strong>${sampleLawyers.length}</strong> potentially relevant lawyers
            </div>
            <div style="display: grid; gap: var(--space-4)">
                ${sampleLawyers.map(l => lawyerCardFull(l)).join('')}
            </div>
        </div>
    </div>`;
}

function lawyerCardFull(l) {
    return `
    <div class="lawyer-card">
        <div class="lawyer-avatar">${l.initials}</div>
        <div class="lawyer-info">
            <div class="lawyer-name">
                ${l.name}
                ${l.verified ? `<span style="color: var(--success-500)" title="Verified Professional">✅</span>` : ''}
            </div>
            <div class="lawyer-details">
                ${l.experience} years experience • ${l.location} • ${l.cases} cases handled
            </div>
            <div class="lawyer-tags">
                ${l.practiceAreas.map(a => badge(a, 'primary')).join('')}
                ${l.languages.map(lang => badge(lang, 'neutral')).join('')}
            </div>
            <div style="margin-top: var(--space-3); font-size: var(--text-sm)">
                <strong>Courts:</strong> ${l.courts.join(', ')}
            </div>
            <div class="lawyer-match">
                <strong style="color: var(--text-primary)">Why this lawyer matches your case:</strong>
                ${l.matchReasons.map(r => `<div class="match-reason">✓ ${r}</div>`).join('')}
            </div>
            <div style="display: flex; gap: var(--space-3); margin-top: var(--space-4)">
                <button class="btn btn-primary btn-sm" data-navigate="/lawyer-profile?id=${l.id}">View Profile</button>
                <button class="btn btn-outline btn-sm">Request Consultation</button>
            </div>
        </div>
        <div style="text-align: right">
            ${badge(l.availability, l.availability === 'Available' ? 'success' : 'warning')}
        </div>
    </div>`;
}

export function init() {}
