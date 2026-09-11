/**
 * Bail Reckoner — Notifications Page
 */
import { navbar, icons, badge } from '../components.js';
import { getRole } from '../state.js';
import { sampleNotifications } from '../data.js';

export function render() {
    const role = getRole();
    const roleName = localStorage.getItem('br_role_name') || 'User';
    const unreadCount = sampleNotifications.filter(n => n.unread).length;

    return `
    <div class="layout-app">
        ${navbar({ showLinks: false, showRole: true, roleName })}
        <div class="page-content animate-fade-in">
            <div class="page-header">
                <div>
                    <h1 class="page-title">${icons.bell} Notifications</h1>
                    <p class="page-subtitle">${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}</p>
                </div>
                <div class="page-actions">
                    <button class="btn btn-ghost btn-sm" id="mark-all-read">Mark all as read</button>
                </div>
            </div>

            <!-- Priority Groups -->
            ${renderGroup('Urgent', sampleNotifications.filter(n => n.type === 'urgent'))}
            ${renderGroup('Important', sampleNotifications.filter(n => n.type === 'important'))}
            ${renderGroup('All Notifications', sampleNotifications.filter(n => n.type === 'normal'))}
        </div>
    </div>`;
}

function renderGroup(title, notifications) {
    if (notifications.length === 0) return '';
    return `
    <div class="section">
        <h3 class="section-title" style="margin-bottom: var(--space-3)">${title}</h3>
        <div class="card" style="padding: 0; overflow: hidden">
            ${notifications.map(n => `
                <div class="notification-item ${n.unread ? 'unread' : ''}">
                    <div class="notification-icon" style="background: ${n.unread ? 'var(--primary-50)' : 'var(--neutral-100)'}">${n.icon}</div>
                    <div class="notification-content">
                        <div class="notification-title">${n.title}</div>
                        <div class="notification-body">${n.body}</div>
                    </div>
                    <div class="notification-time">${n.time}</div>
                </div>
            `).join('')}
        </div>
    </div>`;
}

export function init() {
    document.getElementById('mark-all-read')?.addEventListener('click', () => {
        document.querySelectorAll('.notification-item.unread').forEach(el => el.classList.remove('unread'));
    });
}
