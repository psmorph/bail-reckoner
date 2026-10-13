import assert from 'node:assert/strict';

const storage = new Map([['br_lang', 'en']]);
globalThis.localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key),
};

const toastContainer = { appendChild() {} };
let lastCreatedElement;
globalThis.document = {
    getElementById: id => id === 'toast-container' ? toastContainer : null,
    createElement: () => {
        lastCreatedElement = {
            innerHTML: '',
            className: '',
            querySelector: () => ({ addEventListener() {} }),
            remove() {},
        };
        return lastCreatedElement;
    },
};

const {
    badge,
    caseCard,
    dataTable,
    docCard,
    escapeHtml,
    judgmentCard,
    navbar,
    provisionCard,
    raw,
    showToast,
    statCard,
    timeline,
    cell,
} = await import('../js/components.js');

const payload = '<img src=x onerror=alert(1)>';
const renderedComponents = [
    ['badge', badge(payload, payload)],
    ['statCard', statCard({ icon: payload, iconBg: payload, value: payload, label: payload, change: payload, changeType: payload })],
    ['caseCard', caseCard({
        title: payload, court: payload, date: payload, bailType: payload,
        outcome: payload, sections: payload, similarity: payload,
    })],
    ['provisionCard', provisionCard({
        offense_name: payload, ipc_section: payload, bns_section: payload,
        act_name: payload, section: payload, bailable: payload,
        cognizable: payload, compoundable: payload, category: payload,
        min_punishment_years: payload, max_punishment_years: payload,
        notes: payload, triable_by: payload,
    })],
    ['judgmentCard', judgmentCard({
        case_name: payload, court: payload, year: payload, citation: payload,
        bail_outcome: payload, principle_summary: payload, applicable_categories: payload,
        ipc_sections: payload, similarity: payload, bail_type: payload, date: payload,
    })],
    ['docCard', docCard({ name: payload, type: payload, date: payload, uploadedBy: payload, status: payload })],
    ['timeline', timeline([{ date: payload, title: payload, body: payload, status: payload }])],
    ['dataTable', dataTable({
        columns: [
            { key: 'value', label: payload },
            { key: 'value', label: 'Custom', render: row => raw(cell(row.value)) },
        ],
        rows: [{ value: payload }],
    })],
    ['navbar', navbar({ showLinks: false, showRole: true, roleName: payload })],
];

showToast(payload, payload, 0);
renderedComponents.push(['showToast', lastCreatedElement.innerHTML]);

for (const [name, html] of renderedComponents) {
    assert.equal(typeof html, 'string', `${name} should render a string`);
    assert.ok(!html.includes('<img'), `${name} rendered an unescaped img element`);
    assert.ok(html.includes('&lt;img'), `${name} did not escape dynamic HTML text`);
}

assert.equal(escapeHtml(`&<>"'`), '&amp;&lt;&gt;&quot;&#39;');
const emptyTable = dataTable({ columns: [], rows: [], emptyText: payload });
assert.ok(!emptyTable.includes('<img'), 'dataTable rendered unescaped empty text');
assert.ok(emptyTable.includes('&lt;img'), 'dataTable did not escape empty text');
console.log(`Passed XSS escaping checks for ${renderedComponents.length} shared components.`);
