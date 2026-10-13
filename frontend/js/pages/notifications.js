/**
 * NyaySetu — Notifications Page
 * Connects to the real /api/notifications endpoints.
 */
import { navbar, icons, badge, showToast, escapeHtml } from '../components.js';
import { getRole, isAuthenticated } from '../state.js';
import * as api from '../api.js';

let notifications = [];
let unreadCount = 0;

export function render() {
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
                        <span>Notifications</span>
                    </div>
                    <h1 class="page-title">${icons.bell} Notifications</h1>
                    <p class="page-subtitle" id="notif-subtitle">Loading notifications...</p>
                </div>
                <div class="page-actions">
                    <button class="btn btn-ghost btn-sm" id="mark-all-read">${icons.check} Mark all as read</button>
                    <button class="btn btn-ghost btn-sm" id="refresh-notifs">${icons.search} Refresh</button>
                </div>
            </div>

            <!-- Notification List -->
            <div id="notif-list">
                <div style="text-align: center; padding: var(--space-10)">
                    <div class="spinner spinner-lg" style="margin: 0 auto"></div>
                </div>
            </div>
        </div>
    </div>`;
}

export async function init() {
    document.getElementById('mark-all-read')?.addEventListener('click', handleMarkAllRead);
    document.getElementById('refresh-notifs')?.addEventListener('click', loadNotifications);

    await loadNotifications();
}

async function loadNotifications() {
    const container = document.getElementById('notif-list');

    if (!isAuthenticated()) {
        container.innerHTML = `
            <div class="card" style="text-align: center; padding: var(--space-10)">
                <div style="font-size: 48px; margin-bottom: var(--space-3)">🔒</div>
                <h3>Please log in</h3>
                <p style="color: var(--text-secondary); margin-top: var(--space-2)">You need to be logged in to view notifications.</p>
                <button class="btn btn-primary" style="margin-top: var(--space-4)" data-navigate="/login">Log In</button>
            </div>`;
        return;
    }

    try {
        const data = await api.listNotifications();
        notifications = data.notifications || [];
        unreadCount = data.unread_count || 0;

        document.getElementById('notif-subtitle').textContent =
            `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`;

        if (notifications.length === 0) {
            container.innerHTML = `
                <div class="card" style="text-align: center; padding: var(--space-10)">
                    <div style="font-size: 48px; margin-bottom: var(--space-3)">📭</div>
                    <h3>All caught up!</h3>
                    <p style="color: var(--text-secondary); margin-top: var(--space-2)">
                        You have no notifications. Actions on cases, documents, and evidence will generate notifications here.
                    </p>
                </div>`;
            return;
        }

        // Split into unread and read
        const unread = notifications.filter(n => !n.is_read);
        const read = notifications.filter(n => n.is_read);

        container.innerHTML = `
            ${unread.length > 0 ? renderGroup('Unread', unread, true) : ''}
            ${read.length > 0 ? renderGroup('Earlier', read, false) : ''}
        `;

        // Attach click handlers for mark-as-read
        container.querySelectorAll('.notification-mark-read').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const notifId = btn.dataset.notifId;
                try {
                    await api.markNotificationRead(notifId);
                    btn.closest('.notification-item')?.classList.remove('unread');
                    btn.remove();
                    showToast('Notification marked as read', 'success');
                } catch (err) {
                    showToast('Failed to mark as read: ' + err.message, 'error');
                }
            });
        });
        container.querySelectorAll('.notification-item[data-link]').forEach(item => {
            const navigate = () => { window.location.hash = item.dataset.link; };
            item.addEventListener('click', event => {
                if (!event.target.closest('.notification-mark-read')) navigate();
            });
            item.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigate();
                }
            });
        });
    } catch (err) {
        container.innerHTML = `
            <div class="card" style="padding: var(--space-6); text-align: center; color: var(--text-secondary)">
                Failed to load notifications: ${escapeHtml(err.message)}
            </div>`;
    }
}

function renderGroup(title, items, isUnread) {
    return `
    <div class="section" style="margin-bottom: var(--space-6)">
        <h3 class="section-title" style="margin-bottom: var(--space-3)">${title} ${isUnread ? `<span class="badge badge-primary" style="margin-left: var(--space-2)">${items.length}</span>` : ''}</h3>
        <div class="card" style="padding: 0; overflow: hidden">
            ${items.map(n => {
                const icon = getNotifIcon(n.type);
                const timeAgo = formatTimeAgo(n.created_at);
                const link = safeInternalLink(n.link);
                return `
                <div class="notification-item ${!n.is_read ? 'unread' : ''}" ${link ? `data-link="${escapeHtml(link)}" role="link" tabindex="0"` : ''}>
                    <div class="notification-icon" style="background: ${!n.is_read ? 'var(--primary-50)' : 'var(--neutral-100)'}">${icon}</div>
                    <div class="notification-content">
                        <div class="notification-title">${escapeHtml(n.title || 'Notification')}</div>
                        <div class="notification-body">${escapeHtml(n.body || '')}</div>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: var(--space-1)">
                        <div class="notification-time">${escapeHtml(timeAgo)}</div>
                        ${!n.is_read ? `<button class="btn btn-ghost btn-sm notification-mark-read" data-notif-id="${escapeHtml(n.id)}" title="Mark as read">${icons.check}</button>` : ''}
                    </div>
                </div>`;
            }).join('')}
        </div>
    </div>`;
}

function safeInternalLink(link) {
    if (typeof link !== 'string') return '';
    if (link.startsWith('#/')) return link;
    if (link.startsWith('/') && !link.startsWith('//') && !link.includes('\\')) return link;
    return '';
}

function getNotifIcon(type) {
    return ({ info: 'ℹ️', warning: '⚠️', urgent: '🚨', success: '✅' })[type] || '🔔';
}

function formatTimeAgo(iso) {
    if (!iso) return '';
    try {
        const diff = Date.now() - new Date(iso).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    } catch { return iso; }
}

async function handleMarkAllRead() {
    try {
        await api.markAllNotificationsRead();
        showToast('All notifications marked as read', 'success');
        await loadNotifications();
    } catch (err) {
        showToast('Failed: ' + err.message, 'error');
    }
}
