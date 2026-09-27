import { getLanguage } from './state.js';

export const languages = [
    { value: 'en', label: 'English' },
    { value: 'hi', label: 'हिन्दी' },
    { value: 'mr', label: 'मराठी' },
];

const translations = {
    hi: {
        Home: 'होम', 'How It Works': 'यह कैसे काम करता है', Features: 'सुविधाएँ', 'Legal Database': 'कानूनी डेटाबेस', 'Case Law': 'केस लॉ',
        Login: 'लॉग इन', 'Get Started': 'शुरू करें', Notifications: 'सूचनाएँ', 'Switch Role': 'भूमिका बदलें',
        Dashboard: 'डैशबोर्ड', 'Active Cases': 'सक्रिय मामले', 'New Client Requests': 'नए क्लाइंट अनुरोध',
        'Upcoming Hearings': 'आगामी सुनवाई', 'Documents Pending': 'लंबित दस्तावेज़',
        'Active Investigations': 'सक्रिय जाँच', 'Charge Sheets Pending': 'लंबित आरोप-पत्र',
        'Upcoming Court Dates': 'आगामी अदालत की तारीखें', 'Cases Requiring Action': 'कार्रवाई आवश्यक मामले',
        'Total FIRs (Year)': 'कुल FIR (वर्ष)', 'New Case Analysis': 'नए मामले का विश्लेषण',
        'Upload Case Document': 'मामले का दस्तावेज़ अपलोड करें', 'Active Bail Matters': 'सक्रिय ज़मानत मामले',
        'Recent Client Requests': 'हाल के क्लाइंट अनुरोध', 'Pending Actions': 'लंबित कार्रवाइयाँ',
        'Recent Document Activity': 'हाल की दस्तावेज़ गतिविधि', 'View All': 'सभी देखें', View: 'देखें',
        'Law Enforcement Dashboard': 'कानून प्रवर्तन डैशबोर्ड', 'Case Dashboard': 'केस डैशबोर्ड',
        'Confidential / Authorized Access Only': 'गोपनीय / केवल अधिकृत पहुँच',
        'How can we help you today?': 'आज हम आपकी कैसे मदद कर सकते हैं?',
        Main: 'मुख्य', Tools: 'उपकरण', Other: 'अन्य', Investigation: 'जाँच',
        'My Cases': 'मेरे मामले', 'New Requests': 'नए अनुरोध', Clients: 'क्लाइंट', Documents: 'दस्तावेज़',
        'Legal Research': 'कानूनी शोध', Calendar: 'कैलेंडर', Messages: 'संदेश', Profile: 'प्रोफ़ाइल', Settings: 'सेटिंग्स',
        Cases: 'मामले', FIRs: 'FIR', 'Charge Sheets': 'आरोप-पत्र', 'Case Timeline': 'मामले की समयरेखा',
        'Court Proceedings': 'न्यायालयीन कार्यवाही', Reports: 'रिपोर्ट',
    },
    mr: {
        Home: 'मुख्यपृष्ठ', 'How It Works': 'हे कसे कार्य करते', Features: 'वैशिष्ट्ये', 'Legal Database': 'कायदेशीर डेटाबेस', 'Case Law': 'केस लॉ',
        Login: 'लॉग इन', 'Get Started': 'सुरुवात करा', Notifications: 'सूचना', 'Switch Role': 'भूमिका बदला',
        Dashboard: 'डॅशबोर्ड', 'Active Cases': 'सक्रिय प्रकरणे', 'New Client Requests': 'नवीन क्लायंट विनंत्या',
        'Upcoming Hearings': 'आगामी सुनावणी', 'Documents Pending': 'प्रलंबित कागदपत्रे',
        'Active Investigations': 'सक्रिय तपास', 'Charge Sheets Pending': 'प्रलंबित आरोपपत्रे',
        'Upcoming Court Dates': 'आगामी न्यायालयीन तारखा', 'Cases Requiring Action': 'कारवाई आवश्यक प्रकरणे',
        'Total FIRs (Year)': 'एकूण FIR (वर्ष)', 'New Case Analysis': 'नवीन प्रकरण विश्लेषण',
        'Upload Case Document': 'प्रकरणाचे कागदपत्र अपलोड करा', 'Active Bail Matters': 'सक्रिय जामीन प्रकरणे',
        'Recent Client Requests': 'अलीकडील क्लायंट विनंत्या', 'Pending Actions': 'प्रलंबित कारवाई',
        'Recent Document Activity': 'अलीकडील कागदपत्र क्रियाकलाप', 'View All': 'सर्व पहा', View: 'पहा',
        'Law Enforcement Dashboard': 'कायदा अंमलबजावणी डॅशबोर्ड', 'Case Dashboard': 'केस डॅशबोर्ड',
        'Confidential / Authorized Access Only': 'गोपनीय / फक्त अधिकृत प्रवेश',
        'How can we help you today?': 'आज आम्ही तुमची कशी मदत करू शकतो?',
        Main: 'मुख्य', Tools: 'साधने', Other: 'इतर', Investigation: 'तपास',
        'My Cases': 'माझी प्रकरणे', 'New Requests': 'नवीन विनंत्या', Clients: 'क्लायंट', Documents: 'कागदपत्रे',
        'Legal Research': 'कायदेशीर संशोधन', Calendar: 'दिनदर्शिका', Messages: 'संदेश', Profile: 'प्रोफाइल', Settings: 'सेटिंग्ज',
        Cases: 'प्रकरणे', FIRs: 'FIR', 'Charge Sheets': 'आरोपपत्रे', 'Case Timeline': 'प्रकरणाची वेळरेषा',
        'Court Proceedings': 'न्यायालयीन कार्यवाही', Reports: 'अहवाल',
    },
};

export function t(text, language = getLanguage()) {
    return translations[language]?.[text] || text;
}

export function translateDocument(root = document) {
    const language = getLanguage();
    if (language === 'en') return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
        const value = node.nodeValue.trim();
        if (value && translations[language]?.[value]) {
            node.nodeValue = node.nodeValue.replace(value, translations[language][value]);
        }
    });
}