/**
 * Bail Reckoner — Application State Management
 * Manages current user role, case data, language, and UI state.
 */

export const state = {
    role: null,         // 'public' | 'lawyer' | 'police' | 'judge' | 'admin'
    roleName: '',
    currentCase: null,
    language: 'en',
    sidebarOpen: false,
    notifications: [],
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
