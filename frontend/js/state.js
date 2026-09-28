/**
 * NyaySetu — Application State Management
 * Manages current user role, case data, language, UI state,
 * and platform authentication.
 */

export const state = {
    role: null,         // 'public' | 'lawyer' | 'police' | 'judge' | 'admin' | platform role IDs
    roleName: '',
    currentCase: null,
    language: 'en',
    sidebarOpen: false,
    notifications: [],
    // Platform auth state
    authToken: null,
    user: null,         // Full user profile from JWT login
};

/** Set the current user role */
export function setRole(role, name) {
    state.role = role;
    state.roleName = name || role;
    localStorage.setItem('br_role', role);
    localStorage.setItem('br_role_name', name || role);
}

/** Get the current user role */
export function getRole() {
    if (!state.role) {
        state.role = localStorage.getItem('br_role');
        state.roleName = localStorage.getItem('br_role_name') || state.role;
    }
    return state.role;
}

/** Clear role (logout) */
export function clearRole() {
    state.role = null;
    state.roleName = '';
    state.currentCase = null;
    localStorage.removeItem('br_role');
    localStorage.removeItem('br_role_name');
    // Also clear platform auth
    clearAuth();
}

/** Set current case data */
export function setCurrentCase(caseData) {
    state.currentCase = caseData;
    sessionStorage.setItem('br_case', JSON.stringify(caseData));
}

/** Get current case data */
export function getCurrentCase() {
    if (!state.currentCase) {
        const stored = sessionStorage.getItem('br_case');
        if (stored) {
            try { state.currentCase = JSON.parse(stored); } catch (e) { /* ignore */ }
        }
    }
    return state.currentCase;
}

/** Set language */
export function setLanguage(lang) {
    state.language = lang;
    localStorage.setItem('br_lang', lang);
}

/** Get language */
export function getLanguage() {
    state.language = localStorage.getItem('br_lang') || 'en';
    return state.language;
}

/** Toggle sidebar */
export function toggleSidebar() {
    state.sidebarOpen = !state.sidebarOpen;
    return state.sidebarOpen;
}

// ===== Platform Authentication State =========================================

/** Store authentication token and user profile from platform login */
export function setAuth(token, userProfile) {
    state.authToken = token;
    state.user = userProfile;
    localStorage.setItem('br_auth_token', token);
    localStorage.setItem('br_auth_user', JSON.stringify(userProfile));
    // Also set the role for backward compatibility with existing pages
    if (userProfile) {
        setRole(userProfile.role_id, userProfile.role_name);
    }
}

/** Get the current auth token */
export function getAuthToken() {
    if (!state.authToken) {
        state.authToken = localStorage.getItem('br_auth_token');
    }
    return state.authToken;
}

/** Get the current authenticated user profile */
export function getAuthUser() {
    if (!state.user) {
        const stored = localStorage.getItem('br_auth_user');
        if (stored) {
            try { state.user = JSON.parse(stored); } catch (e) { /* ignore */ }
        }
    }
    return state.user;
}

/** Clear platform authentication state */
export function clearAuth() {
    state.authToken = null;
    state.user = null;
    localStorage.removeItem('br_auth_token');
    localStorage.removeItem('br_auth_user');
}

/** Check if the user is authenticated via the platform */
export function isAuthenticated() {
    return !!getAuthToken();
}

/** Check if the current user has a specific permission */
export function hasPermission(permission) {
    const user = getAuthUser();
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission);
}
