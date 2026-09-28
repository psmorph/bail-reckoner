/**
 * NyaySetu — Notifications Page
 * Connects to the real /api/notifications endpoints.
 */
import { navbar, icons, badge, showToast } from '../components.js';
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
    } catch (err) {
        container.innerHTML = `
            <div class="card" style="padding: var(--space-6); text-align: center; color: var(--text-secondary)">
                Failed to load notifications: ${err.message}
            </div>`;
    }
}

function renderGroup(title, items, isUnread) {
    return `
    <div class="section" style="margin-bottom: var(--space-6)">
        <h3 class="section-title" style="margin-bottom: var(--space-3)">${title} ${isUnread ? `<span class="badge badge-primary" style="margin-left: var(--space-2)">${items.length}</span>` : ''}</h3>
        <div class="card" style="padding: 0; overflow: hidden">
            ${items.map(n => {
                const icon = getNotifIcon(n.action);
                const timeAgo = formatTimeAgo(n.created_at);
                return `
                <div class="notification-item ${!n.is_read ? 'unread' : ''}">
                    <div class="notification-icon" style="background: ${!n.is_read ? 'var(--primary-50)' : 'var(--neutral-100)'}">${icon}</div>
                    <div class="notification-content">
                        <div class="notification-title">${n.title || n.action || 'Notification'}</div>
                        <div class="notification-body">${n.message || ''}</div>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: var(--space-1)">
                        <div class="notification-time">${timeAgo}</div>
                        ${!n.is_read ? `<button class="btn btn-ghost btn-sm notification-mark-read" data-notif-id="${n.id}" title="Mark as read">${icons.check}</button>` : ''}
                    </div>
                </div>`;
            }).join('')}
        </div>
    </div>`;
}

function getNotifIcon(action) {
    if (!action) return '🔔';
    if (action.includes('case')) return '📋';
    if (action.includes('document')) return '📄';
    if (action.includes('evidence')) return '🔍';
    if (action.includes('court') || action.includes('hearing')) return '🏛️';
    if (action.includes('blockchain')) return '🔗';
    if (action.includes('investigation')) return '🔎';
    return '🔔';
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
