/**
 * Bail Reckoner — Sample Data
 * Realistic but clearly fictional data for the UI prototype.
 * All names, case numbers, and legal details are entirely fictional.
 */

// ===== SAMPLE LAWYERS ========================================================

export const sampleLawyers = [
    {
        id: 1, name: 'Adv. Priya Sharma', initials: 'PS',
        experience: 14, location: 'New Delhi',
        courts: ['Delhi High Court', 'Patiala House Court', 'Saket Court'],
        practiceAreas: ['Criminal Law', 'Bail Matters', 'White Collar Crime'],
        languages: ['English', 'Hindi'],
        cases: 280, verified: true,
        education: 'B.A. LL.B., National Law University, Delhi',
        barId: 'DL/1234/2010',
        matchReasons: ['Practices in relevant court', 'Criminal law experience', 'Experience with similar offences', 'Language match'],
        availability: 'Available',
    },
    {
        id: 2, name: 'Adv. Rajesh Kulkarni', initials: 'RK',
        experience: 22, location: 'Mumbai',
        courts: ['Bombay High Court', 'Sessions Court Mumbai'],
        practiceAreas: ['Criminal Law', 'NDPS Act', 'PMLA'],
        languages: ['English', 'Hindi', 'Marathi'],
        cases: 450, verified: true,
        education: 'LL.M., Government Law College, Mumbai',
        barId: 'MH/5678/2002',
        matchReasons: ['Practices in relevant court', 'NDPS Act expertise', 'Extensive bail experience'],
        availability: 'Available',
    },
    {
        id: 3, name: 'Adv. Meena Iyer', initials: 'MI',
        experience: 8, location: 'Bangalore',
        courts: ['Karnataka High Court', 'City Civil Court Bangalore'],
        practiceAreas: ['Criminal Law', 'Cyber Crime', 'IT Act'],
        languages: ['English', 'Hindi', 'Kannada'],
        cases: 120, verified: true,
        education: 'B.A. LL.B., NLSIU Bangalore',
        barId: 'KA/9012/2016',
        matchReasons: ['Cyber crime expertise', 'IT Act specialization', 'Language match'],
        availability: 'Limited',
    },
    {
        id: 4, name: 'Adv. Arjun Singh', initials: 'AS',
        experience: 18, location: 'Lucknow',
        courts: ['Allahabad High Court', 'Lucknow Bench'],
        practiceAreas: ['Criminal Law', 'Constitutional Law', 'Human Rights'],
        languages: ['English', 'Hindi', 'Urdu'],
        cases: 350, verified: true,
        education: 'LL.B., Lucknow University; LL.M., BHU',
        barId: 'UP/3456/2006',
        matchReasons: ['Constitutional law expertise', 'Extensive bail experience', 'Practices in relevant court'],
        availability: 'Available',
    },
];

// ===== SAMPLE CASE ===========================================================

export const sampleCase = {
    caseId: 'FIR/2025/DL/004521',
    court: 'Patiala House Court, New Delhi',
    judge: 'Duty Magistrate',
    accused: 'Fictional Accused Person',
    stage: 'Post Charge Sheet — Pre-Trial',
    filingDate: '2025-03-15',
    arrestDate: '2025-03-14',
    chargeSheetDate: '2025-05-10',
    sections: '420, 468, 471',
    specialLaws: '',
    charges: [
        { section: '420', act: 'IPC', bns: '318', offence: 'Cheating and dishonestly inducing delivery of property', punishment: 'Up to 7 years + fine', bailable: 'Non-Bailable', status: 'Requires Review' },
        { section: '468', act: 'IPC', bns: '336', offence: 'Forgery for purpose of cheating', punishment: 'Up to 7 years + fine', bailable: 'Non-Bailable', status: 'Requires Review' },
        { section: '471', act: 'IPC', bns: '339', offence: 'Using as genuine a forged document', punishment: 'As for forgery', bailable: 'Non-Bailable', status: 'Requires Review' },
    ],
    simpleSummary: {
        what: 'According to the charge sheet, the complainant alleges that the accused obtained money by presenting forged documents and misrepresenting facts, causing financial loss to the complainant.',
        accused: 'You are accused of cheating by dishonest inducement (Section 420 IPC), creating forged documents for cheating (Section 468 IPC), and using those forged documents as if they were genuine (Section 471 IPC).',
        laws: 'The charges fall under the Indian Penal Code (IPC). All three charges are non-bailable offences, meaning bail is not a matter of right but is at the discretion of the court.',
        next: 'The case is currently at the pre-trial stage. The next step would be framing of charges by the court. If you wish to apply for bail, you or your lawyer can file a bail application before the court.',
        discuss: 'You should discuss the specific facts of your case, the strength of the prosecution\'s evidence, your personal circumstances, and whether there are grounds for bail. Your lawyer can advise on the best course of action.',
    },
};

// ===== SAMPLE TIMELINE =======================================================

export const sampleTimeline = [
    { date: '14 Mar 2025', title: 'FIR Registered', body: 'FIR No. 004521 filed at PS Connaught Place, Delhi.', status: 'completed' },
    { date: '14 Mar 2025', title: 'Arrest', body: 'Accused arrested by investigating officer.', status: 'completed' },
    { date: '15 Mar 2025', title: 'First Production', body: 'Produced before Duty Magistrate, Patiala House Court.', status: 'completed' },
    { date: '15 Mar 2025', title: 'Judicial Remand', body: '14-day judicial custody ordered.', status: 'completed' },
    { date: '10 May 2025', title: 'Charge Sheet Filed', body: 'Police charge sheet filed under Sections 420, 468, 471 IPC.', status: 'completed' },
    { date: '25 May 2025', title: 'Bail Application Filed', body: 'Bail application submitted by defence counsel.', status: 'completed' },
    { date: '10 Jun 2025', title: 'Next Hearing', body: 'Scheduled for arguments on bail application.', status: '' },
    { date: 'Pending', title: 'Court Order', body: 'Awaiting court decision on bail application.', status: 'pending' },
];

// ===== SAMPLE NOTIFICATIONS ==================================================

export const sampleNotifications = [
    { id: 1, type: 'urgent', icon: '🔴', title: 'Upcoming Hearing', body: 'Next hearing on case FIR/2025/DL/004521 — 10 Jun 2025 at 10:30 AM', time: '2 hours ago', unread: true },
    { id: 2, type: 'important', icon: '🟡', title: 'Document Request', body: 'Your lawyer has requested additional documents for bail application.', time: '1 day ago', unread: true },
    { id: 3, type: 'normal', icon: '🔵', title: 'Lawyer Response', body: 'Adv. Priya Sharma has accepted your consultation request.', time: '2 days ago', unread: false },
    { id: 4, type: 'normal', icon: '🔵', title: 'Case Update', body: 'Charge sheet analysis completed for FIR/2025/DL/004521.', time: '3 days ago', unread: false },
    { id: 5, type: 'normal', icon: '⚪', title: 'Legal Update', body: 'New BNSS 2023 provisions now available in legal database.', time: '1 week ago', unread: false },
];

// ===== SAMPLE DOCUMENTS ======================================================

export const sampleDocuments = [
    { name: 'FIR_004521.pdf', type: 'PDF', date: '15 Mar 2025', uploadedBy: 'System', status: 'Verified', category: 'FIR' },
    { name: 'Charge_Sheet_Final.pdf', type: 'PDF', date: '10 May 2025', uploadedBy: 'Investigating Officer', status: 'Verified', category: 'Charge Sheet' },
    { name: 'Bail_Application.pdf', type: 'PDF', date: '25 May 2025', uploadedBy: 'Defence Counsel', status: 'Uploaded', category: 'Bail Application' },
    { name: 'Arrest_Memo.pdf', type: 'PDF', date: '14 Mar 2025', uploadedBy: 'Police', status: 'Verified', category: 'Arrest Memo' },
    { name: 'Remand_Order.pdf', type: 'PDF', date: '15 Mar 2025', uploadedBy: 'Court', status: 'Verified', category: 'Court Orders' },
    { name: 'Supporting_Evidence_1.jpg', type: 'IMG', date: '20 Apr 2025', uploadedBy: 'Investigating Officer', status: 'Under Review', category: 'Evidence' },
];

// ===== SIDEBAR CONFIGS =======================================================

export const lawyerSidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', route: '/lawyer-dashboard', group: 'Main' },
    { id: 'cases', label: 'My Cases', icon: '📁', route: '/lawyer-dashboard?tab=cases', group: 'Main' },
    { id: 'requests', label: 'New Requests', icon: '📨', badge: '3', route: '/lawyer-dashboard?tab=requests', group: 'Main' },
    { id: 'clients', label: 'Clients', icon: '👥', route: '/lawyer-dashboard?tab=clients', group: 'Main' },
    { id: 'documents', label: 'Documents', icon: '📄', route: '/documents', group: 'Tools' },
    { id: 'research', label: 'Legal Research', icon: '🔍', route: '/case-law-search', group: 'Tools' },
    { id: 'provisions', label: 'Legal Database', icon: '📚', route: '/legal-provisions', group: 'Tools' },
    { id: 'calendar', label: 'Calendar', icon: '📅', route: '/lawyer-dashboard?tab=calendar', group: 'Tools' },
    { id: 'messages', label: 'Messages', icon: '💬', route: '/lawyer-dashboard?tab=messages', group: 'Tools' },
    { id: 'notifications', label: 'Notifications', icon: '🔔', badge: '2', route: '/notifications', group: 'Other' },
    { id: 'profile', label: 'Profile', icon: '👤', route: '/lawyer-profile', group: 'Other' },
    { id: 'settings', label: 'Settings', icon: '⚙️', route: '/lawyer-dashboard?tab=settings', group: 'Other' },
];

export const policeSidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', route: '/police-dashboard', group: 'Main' },
    { id: 'cases', label: 'Cases', icon: '📁', route: '/police-dashboard?tab=cases', group: 'Main' },
    { id: 'firs', label: 'FIRs', icon: '📋', route: '/police-dashboard?tab=firs', group: 'Main' },
    { id: 'chargesheets', label: 'Charge Sheets', icon: '📄', route: '/police-dashboard?tab=chargesheets', group: 'Main' },
    { id: 'timeline', label: 'Case Timeline', icon: '🕐', route: '/case-timeline', group: 'Investigation' },
    { id: 'documents', label: 'Documents', icon: '📁', route: '/documents', group: 'Investigation' },
    { id: 'court', label: 'Court Proceedings', icon: '🏛️', route: '/police-dashboard?tab=court', group: 'Investigation' },
    { id: 'actions', label: 'Pending Actions', icon: '⚡', badge: '5', route: '/police-dashboard?tab=actions', group: 'Investigation' },
    { id: 'reports', label: 'Reports', icon: '📊', route: '/police-dashboard?tab=reports', group: 'Other' },
    { id: 'notifications', label: 'Notifications', icon: '🔔', badge: '3', route: '/notifications', group: 'Other' },
];

export const judicialSidebarItems = [
    { id: 'dashboard', label: 'Case Dashboard', icon: '📊', route: '/judicial-dashboard', group: 'Main' },
    { id: 'info', label: 'Case Information', icon: '📋', route: '/judicial-dashboard?tab=info', group: 'Case' },
    { id: 'charges', label: 'Charges', icon: '⚖️', route: '/judicial-dashboard?tab=charges', group: 'Case' },
    { id: 'custody', label: 'Custody History', icon: '🕐', route: '/case-timeline', group: 'Case' },
    { id: 'bail', label: 'Bail Applications', icon: '📄', route: '/bail-reckoner', group: 'Case' },
    { id: 'orders', label: 'Previous Orders', icon: '📁', route: '/judicial-dashboard?tab=orders', group: 'Case' },
    { id: 'provisions', label: 'Relevant Provisions', icon: '📚', route: '/legal-provisions', group: 'Reference' },
    { id: 'judgments', label: 'Relevant Judgments', icon: '🔍', route: '/case-law-search', group: 'Reference' },
    { id: 'documents', label: 'Documents', icon: '📁', route: '/documents', group: 'Reference' },
    { id: 'audit', label: 'Audit Trail', icon: '🔒', route: '/judicial-dashboard?tab=audit', group: 'Other' },
];

export const adminSidebarItems = [
    { id: 'dashboard', label: 'Overview', icon: '📊', route: '/admin', group: 'Main' },
    { id: 'acts', label: 'Acts & Sections', icon: '📚', route: '/admin?tab=acts', group: 'Legal Data' },
    { id: 'punishments', label: 'Punishments', icon: '⚖️', route: '/admin?tab=punishments', group: 'Legal Data' },
    { id: 'classifications', label: 'Classifications', icon: '🏷️', route: '/admin?tab=classifications', group: 'Legal Data' },
    { id: 'special', label: 'Special Statutes', icon: '📋', route: '/admin?tab=special', group: 'Legal Data' },
    { id: 'precedents', label: 'Judicial Precedents', icon: '🔍', route: '/admin?tab=precedents', group: 'Legal Data' },
    { id: 'updates', label: 'Legal Updates', icon: '🔔', route: '/admin?tab=updates', group: 'Management' },
    { id: 'verification', label: 'Data Verification', icon: '✅', route: '/admin?tab=verification', group: 'Management' },
    { id: 'users', label: 'User Management', icon: '👥', route: '/admin?tab=users', group: 'Management' },
    { id: 'audit', label: 'Audit Logs', icon: '🔒', route: '/admin?tab=audit', group: 'Management' },
];
