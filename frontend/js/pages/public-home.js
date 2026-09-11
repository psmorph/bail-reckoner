/**
 * Bail Reckoner — Public / Common User Home
 */
import { navbar, icons, featureCard, disclaimer } from '../components.js';

export function render() {
    return `
    <div class="layout-app">
        ${navbar({ showLinks: false, showRole: true, roleName: 'Public User' })}
        <div class="purpose-page animate-fade-in">
            <div class="container">
                <h2 class="purpose-heading">How can we help you today?</h2>
                <p class="purpose-sub">Choose an option below. Everything is explained in simple, easy-to-understand language.</p>

                <div style="display: flex; justify-content: center; margin-bottom: var(--space-8)">
                    <div class="alert alert-info" style="max-width: 500px">
                        <span class="alert-icon">${icons.language}</span>
                        <div class="alert-content">
                            <strong>भाषा बदलें / भाषा बदला</strong> — Use the language selector at the top to switch to Hindi or Marathi.
                        </div>
                    </div>
                </div>

                <div class="purpose-grid" style="grid-template-columns: repeat(3, 1fr); max-width: 900px">
                    ${featureCard({ icon: '📖', iconBg: 'var(--primary-50)', title: 'Understand My Case', description: 'Upload your case papers and we will explain them in simple language.', route: '/case-upload' })}
                    ${featureCard({ icon: '⚖️', iconBg: 'var(--success-50)', title: 'Check Bail Information', description: 'See if bail may be possible and what the law says about your situation.', route: '/bail-reckoner' })}
                    ${featureCard({ icon: '👨‍⚖️', iconBg: 'var(--warning-50)', title: 'Find a Lawyer', description: 'Find a lawyer who can help with your type of case in your area.', route: '/lawyer-discovery' })}
                    ${featureCard({ icon: '🕐', iconBg: 'var(--info-50)', title: 'Track My Case', description: 'See all the dates and events in your case so far.', route: '/case-timeline' })}
                    ${featureCard({ icon: '📄', iconBg: 'var(--neutral-100)', title: 'Understand This Document', description: 'Upload any legal document and get it explained simply.', route: '/case-upload' })}
                    ${featureCard({ icon: '🤝', iconBg: 'var(--danger-50)', title: 'Get Legal Aid', description: 'Find free or low-cost legal help near you.', route: '/legal-aid' })}
                </div>

                <div style="margin-top: var(--space-10); max-width: 700px; margin-left: auto; margin-right: auto">
                    ${disclaimer()}
                </div>
            </div>
        </div>
    </div>`;
}

export function init() {}
