/**
 * Bail Reckoner — Purpose Selection Page
 */
import { navbar, featureCard, icons } from '../components.js';
import { getRole } from '../state.js';

export function render() {
    const role = getRole();
    const roleName = localStorage.getItem('br_role_name') || 'User';
    const isPublic = role === 'public';

    return `
    <div class="layout-app">
        ${navbar({ showLinks: false, showRole: true, roleName })}
        <div class="purpose-page animate-fade-in">
            <div class="container">
                <h2 class="purpose-heading">${isPublic ? 'How can we help you today?' : 'What would you like to do?'}</h2>
                <p class="purpose-sub">${isPublic ? 'Choose an option below. Everything is explained in simple language.' : 'Select an action to get started with your work.'}</p>
                
                <div class="purpose-grid">
                    ${isPublic ? publicCards() : professionalCards(role)}
                </div>

                ${isPublic ? `
                <div style="margin-top: var(--space-10); max-width: 600px; margin-left: auto; margin-right: auto">
                    <div class="alert alert-info">
                        <span class="alert-icon">${icons.language}</span>
                        <div class="alert-content">
                            <div class="alert-title">Need help in another language?</div>
                            <div>Use the language selector at the top of the page to switch between English, Hindi, and Marathi.</div>
                        </div>
                    </div>
                </div>` : ''}
            </div>
        </div>
    </div>`;
}

function publicCards() {
    return `
        ${featureCard({ icon: '📄', iconBg: 'var(--primary-50)', title: 'Understand My Case', description: 'Upload your case documents and get a simple explanation of what they mean.', route: '/case-upload' })}
        ${featureCard({ icon: '⚖️', iconBg: 'var(--success-50)', title: 'Check Bail Information', description: 'Review relevant bail provisions and understand your options.', route: '/bail-reckoner' })}
        ${featureCard({ icon: '👨‍⚖️', iconBg: 'var(--warning-50)', title: 'Find a Lawyer', description: 'Find lawyers who may be able to help with your type of case.', route: '/lawyer-discovery' })}
        ${featureCard({ icon: '🕐', iconBg: 'var(--info-50)', title: 'Track My Case', description: 'View important dates, what has happened, and what happens next.', route: '/case-timeline' })}
        ${featureCard({ icon: '📖', iconBg: 'var(--neutral-100)', title: 'Understand a Document', description: 'Upload any legal document and get a plain-language explanation.', route: '/case-upload' })}
        ${featureCard({ icon: '🤝', iconBg: 'var(--danger-50)', title: 'Get Legal Aid', description: 'Find free or affordable legal assistance in your area.', route: '/legal-aid' })}
    `;
}

function professionalCards(role) {
    const cards = [
        { icon: '📄', iconBg: 'var(--primary-50)', title: 'Analyze a Case', description: 'Upload FIR, charge sheet, court order or other case documents for AI-assisted analysis.', route: '/case-upload' },
        { icon: '⚖️', iconBg: 'var(--success-50)', title: 'Check Bail Eligibility', description: 'Review relevant bail provisions, custody thresholds, and statutory parameters.', route: '/bail-reckoner' },
        { icon: '📚', iconBg: 'var(--info-50)', title: 'Legal Research', description: 'Search statutes, provisions, and judicial precedents.', route: '/legal-provisions' },
        { icon: '🔍', iconBg: 'var(--warning-50)', title: 'Search Case Law', description: 'Find relevant judgments and bail-related precedents.', route: '/case-law-search' },
        { icon: '🕐', iconBg: 'var(--neutral-100)', title: 'Track Case Progress', description: 'View important dates, procedural stages, and document status.', route: '/case-timeline' },
        { icon: '📁', iconBg: 'var(--primary-50)', title: 'View Case Documents', description: 'Access, preview, and manage case-related documents.', route: '/documents' },
    ];

    if (role === 'lawyer') {
        cards.push({ icon: '📊', iconBg: 'var(--primary-50)', title: 'My Dashboard', description: 'View active cases, client requests, and upcoming hearings.', route: '/lawyer-dashboard' });
        cards.push({ icon: '👨‍⚖️', iconBg: 'var(--success-50)', title: 'Find Lawyers', description: 'Connect with lawyers for case collaboration or referrals.', route: '/lawyer-discovery' });
    }

    return cards.map(c => featureCard(c)).join('');
}

export function init() {
    // Feature cards navigation handled by global router
}
