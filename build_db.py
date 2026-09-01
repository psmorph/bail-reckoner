"""
Bail Reckoner - Database Builder
=================================
Builds bail_reckoner.db (SQLite) with:
  1. offenses            -> section-level mapping (IPC 1860 <-> BNS 2023), punishment,
                             bailable/cognizable/compoundable status, category
  2. special_acts_offenses-> offenses under special statutes (POCSO, IT Act, SC/ST Act, etc.)
  3. judgments            -> landmark bail-related case law, tagged to categories
  4. procedural_checklist -> documents/bonds required per offense category
  5. custody_rules        -> statutory undertrial-release thresholds (436A CrPC / 479 BNSS etc.)

IMPORTANT / DISCLAIMER
-----------------------
This is SEED DATA for an SIH hackathon MVP demo, not a certified legal database.
Bailable/cognizable/compoundable classifications, and IPC<->BNS section mappings,
must be cross-verified against the First Schedule of the CrPC / BNSS and the Gazette
notification of BNS 2023 before ANY real-world or production use. Several mappings
(especially multi-section splits like rape 376->63/64/65/70) are simplified here for
demo purposes. Treat this as a scaffold to be corrected/expanded by someone with
access to bare acts, not as legal advice.
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "bail_reckoner.db")
if os.path.exists(DB_PATH):
    os.remove(DB_PATH)

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

cur.executescript("""
PRAGMA foreign_keys = ON;

CREATE TABLE offenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ipc_section TEXT,
    bns_section TEXT,
    offense_name TEXT NOT NULL,
    category TEXT NOT NULL,              -- general | economic | women | children | sc_st | state | cyber | foreigners
    min_punishment_years REAL,
    max_punishment_years REAL,
    fine_applicable INTEGER,             -- 0/1
    death_or_life INTEGER DEFAULT 0,     -- 1 if death/life imprisonment is a possible sentence
    bailable TEXT NOT NULL,              -- 'bailable' | 'non-bailable'
    cognizable TEXT NOT NULL,            -- 'cognizable' | 'non-cognizable'
    compoundable TEXT NOT NULL,          -- 'compoundable' | 'non-compoundable' | 'compoundable_with_permission'
    triable_by TEXT,
    notes TEXT
);

CREATE TABLE special_acts_offenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    act_name TEXT NOT NULL,              -- e.g. 'Information Technology Act, 2000'
    section TEXT NOT NULL,
    offense_name TEXT NOT NULL,
    category TEXT NOT NULL,              -- cyber | sc_st | women | children | state | economic | foreigners
    min_punishment_years REAL,
    max_punishment_years REAL,
    fine_applicable INTEGER,
    bailable TEXT NOT NULL,
    cognizable TEXT NOT NULL,
    compoundable TEXT NOT NULL,
    notes TEXT
);

CREATE TABLE judgments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_name TEXT NOT NULL,
    citation TEXT,
    year INTEGER,
    court TEXT,
    principle_summary TEXT NOT NULL,     -- plain-language summary, not verbatim quote
    applicable_categories TEXT NOT NULL  -- comma-separated: general,women,economic,cyber,...
);

CREATE TABLE procedural_checklist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    bail_type TEXT NOT NULL,             -- 'regular' | 'anticipatory' | 'default/statutory' | 'interim'
    requirement TEXT NOT NULL,
    is_mandatory INTEGER DEFAULT 1
);

CREATE TABLE custody_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_name TEXT NOT NULL,
    source_provision TEXT NOT NULL,      -- e.g. 'Section 436A CrPC / Section 479 BNSS'
    description TEXT NOT NULL,
    threshold_fraction REAL,             -- e.g. 0.5 for 'half of max sentence'
    applies_to TEXT NOT NULL,            -- 'all' | 'first_time_offender' | category name
    exclusion_notes TEXT
);
""")

# -------------------------------------------------------------------
# 1. OFFENSES  (IPC 1860 <-> BNS 2023) — core/general offenses
# -------------------------------------------------------------------
offenses = [
    # ipc, bns, name, category, min_yrs, max_yrs, fine, death_or_life, bailable, cognizable, compoundable, triable_by, notes
    ("302", "103(1)", "Murder", "general", None, None, 0, 1, "non-bailable", "cognizable", "non-compoundable", "Court of Session", "Punishment: death or life imprisonment + fine"),
    ("304", "105", "Culpable homicide not amounting to murder", "general", None, 10, 1, 1, "non-bailable", "cognizable", "non-compoundable", "Court of Session", "Life imprisonment possible in Part I"),
    ("304B", "80", "Dowry death", "women", 7, None, 0, 1, "non-bailable", "cognizable", "non-compoundable", "Court of Session", "Min 7 yrs, may extend to life"),
    ("307", "109", "Attempt to murder", "general", None, 10, 1, 1, "non-bailable", "cognizable", "non-compoundable", "Court of Session", "Life imprisonment possible"),
    ("323", "115(2)", "Voluntarily causing hurt", "general", None, 1, 1, 0, "bailable", "non-cognizable", "compoundable", "Any Magistrate", None),
    ("325", "117(2)", "Voluntarily causing grievous hurt", "general", None, 7, 1, 0, "bailable", "cognizable", "compoundable_with_permission", "Magistrate of the first class", None),
    ("326", "118(2)", "Grievous hurt by dangerous weapons", "general", None, 10, 1, 0, "non-bailable", "cognizable", "non-compoundable", "Court of Session", None),
    ("354", "74", "Assault/criminal force to woman with intent to outrage modesty", "women", 1, 5, 1, 0, "non-bailable", "cognizable", "non-compoundable", "Any Magistrate", None),
    ("363", "137(2)", "Kidnapping", "general", None, 7, 1, 0, "bailable", "cognizable", "non-compoundable", "Magistrate of the first class", None),
    ("366", "137(2)", "Kidnapping/abducting woman to compel marriage", "women", None, 10, 1, 0, "non-bailable", "cognizable", "non-compoundable", "Court of Session", None),
    ("376", "64/65/66/70", "Rape", "women", 10, None, 0, 1, "non-bailable", "cognizable", "non-compoundable", "Court of Session", "BNS splits into multiple graded sections; life imprisonment in aggravated cases"),
    ("379", "303(2)", "Theft", "general", None, 3, 1, 0, "bailable", "cognizable", "compoundable_with_permission", "Any Magistrate", None),
    ("380", "305", "Theft in dwelling house", "general", None, 7, 1, 0, "non-bailable", "cognizable", "compoundable_with_permission", "Magistrate of the first class", None),
    ("392", "309(4)", "Robbery", "general", None, 10, 1, 0, "non-bailable", "cognizable", "non-compoundable", "Magistrate of the first class / Sessions", "Non-bailable if committed on highway between sunset/sunrise"),
    ("395", "310(2)", "Dacoity", "general", None, 10, 1, 0, "non-bailable", "cognizable", "non-compoundable", "Court of Session", "Life imprisonment possible"),
    ("406", "316(2)", "Criminal breach of trust (simple)", "economic", None, 3, 1, 0, "bailable", "non-cognizable", "compoundable_with_permission", "Magistrate of the first class", None),
    ("409", "316(5)", "Criminal breach of trust by public servant/banker/agent", "economic", None, 10, 1, 0, "non-bailable", "cognizable", "non-compoundable", "Magistrate of the first class / Sessions", None),
    ("420", "318(4)", "Cheating and dishonestly inducing delivery of property", "economic", None, 7, 1, 0, "non-bailable", "cognizable", "compoundable_with_permission", "Magistrate of the first class", None),
    ("467", "336(3)", "Forgery of valuable security/will", "economic", None, 10, 1, 0, "non-bailable", "non-cognizable", "non-compoundable", "Magistrate of the first class", None),
    ("468", "336(3)", "Forgery for purpose of cheating", "economic", None, 7, 1, 0, "non-bailable", "cognizable", "non-compoundable", "Magistrate of the first class", None),
    ("471", "340(2)", "Using forged document as genuine", "economic", None, 7, 1, 0, "non-bailable", "cognizable", "non-compoundable", "Magistrate of the first class", None),
    ("498A", "85", "Cruelty by husband or relatives", "women", 3, None, 1, 0, "non-bailable", "cognizable", "compoundable_with_permission", "Magistrate of the first class", None),
    ("506", "351(2)/351(3)", "Criminal intimidation", "general", None, 7, 1, 0, "bailable", "non-cognizable", "compoundable", "Any Magistrate", "Part II (threat of death/grievous hurt) is non-bailable"),
    ("509", "79", "Word/gesture insulting modesty of a woman", "women", None, 3, 1, 0, "bailable", "cognizable", "compoundable", "Any Magistrate", None),
    ("120B", "61(2)", "Criminal conspiracy", "general", None, None, 1, 0, "non-bailable", "cognizable", "non-compoundable", "Same as the offense conspired", "Depends on gravity of underlying offense"),
    ("124A", "152", "Sedition / acts endangering sovereignty & unity (BNS reframing)", "state", None, 7, 1, 1, "non-bailable", "cognizable", "non-compoundable", "Court of Session", "IPC 124A repealed; BNS 152 covers acts endangering sovereignty, unity, integrity"),
    ("121", "147", "Waging war against the Government of India", "state", None, None, 1, 1, "non-bailable", "cognizable", "non-compoundable", "Court of Session", "Death/life imprisonment"),
    ("489A", "178", "Counterfeiting currency notes/bank notes", "economic", None, None, 1, 1, "non-bailable", "cognizable", "non-compoundable", "Court of Session", "Life imprisonment possible"),
    ("174A", "209", "Non-appearance in response to proclamation u/s 82 CrPC/BNSS", "general", None, 7, 1, 0, "non-bailable", "cognizable", "non-compoundable", "Magistrate of the first class", None),
]

cur.executemany("""
INSERT INTO offenses (ipc_section, bns_section, offense_name, category, min_punishment_years,
    max_punishment_years, fine_applicable, death_or_life, bailable, cognizable, compoundable,
    triable_by, notes)
VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
""", offenses)

# -------------------------------------------------------------------
# 2. SPECIAL ACTS OFFENSES
# -------------------------------------------------------------------
special = [
    # act, section, name, category, min_yrs, max_yrs, fine, bailable, cognizable, compoundable, notes
    ("Information Technology Act, 2000", "66", "Computer-related offences (hacking/data theft)", "cyber", None, 3, 1, "bailable", "cognizable", "compoundable", "Fine up to Rs. 5 lakh"),
    ("Information Technology Act, 2000", "66C", "Identity theft", "cyber", None, 3, 1, "bailable", "cognizable", "compoundable", None),
    ("Information Technology Act, 2000", "66E", "Violation of privacy (capturing/publishing images)", "cyber", None, 3, 1, "bailable", "cognizable", "compoundable", None),
    ("Information Technology Act, 2000", "66F", "Cyber terrorism", "cyber", None, None, 0, "non-bailable", "cognizable", "non-compoundable", "Punishable with imprisonment for life"),
    ("Information Technology Act, 2000", "67", "Publishing/transmitting obscene material electronically", "cyber", None, 3, 1, "bailable", "cognizable", "non-compoundable", "First conviction; enhanced for subsequent"),
    ("Information Technology Act, 2000", "67B", "Publishing/transmitting child sexual abuse material electronically", "children", None, 5, 1, "non-bailable", "cognizable", "non-compoundable", None),
    ("Protection of Children from Sexual Offences (POCSO) Act, 2012", "4", "Penetrative sexual assault on a child", "children", 10, None, 1, "non-bailable", "cognizable", "non-compoundable", "Min 10/20 yrs depending on age of child"),
    ("Protection of Children from Sexual Offences (POCSO) Act, 2012", "6", "Aggravated penetrative sexual assault", "children", 20, None, 1, "non-bailable", "cognizable", "non-compoundable", "Min 20 yrs to life, or death in specific cases"),
    ("Protection of Children from Sexual Offences (POCSO) Act, 2012", "8", "Sexual assault on a child", "children", 3, 5, 1, "non-bailable", "cognizable", "non-compoundable", None),
    ("Protection of Children from Sexual Offences (POCSO) Act, 2012", "12", "Sexual harassment of a child", "children", None, 3, 1, "bailable", "cognizable", "non-compoundable", None),
    ("Scheduled Castes and Scheduled Tribes (Prevention of Atrocities) Act, 1989", "3(1)", "Atrocities against SC/ST — intentional insult/humiliation, wrongful dispossession etc.", "sc_st", None, 5, 1, "non-bailable", "cognizable", "non-compoundable", "Bail under this Act has additional statutory conditions (Sec 18/18A restrict anticipatory bail)"),
    ("Scheduled Castes and Scheduled Tribes (Prevention of Atrocities) Act, 1989", "3(2)", "Aggravated atrocities causing death/grievous hurt", "sc_st", 10, None, 1, "non-bailable", "cognizable", "non-compoundable", "Life imprisonment possible"),
    ("Protection of Women from Domestic Violence Act, 2005", "31", "Breach of protection order by respondent", "women", None, 1, 1, "bailable", "cognizable", "non-compoundable", None),
    ("Dowry Prohibition Act, 1961", "3", "Giving or taking dowry", "women", 5, None, 1, "non-bailable", "cognizable", "non-compoundable", None),
    ("Unlawful Activities (Prevention) Act, 1967", "13", "Unlawful activities (acts against integrity/sovereignty)", "state", None, 7, 1, "non-bailable", "cognizable", "non-compoundable", "Sec 43D(5) UAPA imposes additional restrictions on bail"),
    ("Unlawful Activities (Prevention) Act, 1967", "18", "Conspiracy/advocacy of terrorist acts", "state", 5, None, 0, "non-bailable", "cognizable", "non-compoundable", "Life imprisonment possible; bail restricted under 43D(5)"),
    ("Prevention of Money Laundering Act, 2002", "3/4", "Money laundering", "economic", 3, 7, 1, "non-bailable", "cognizable", "non-compoundable", "Sec 45 PMLA imposes twin conditions for bail"),
    ("Foreigners Act, 1946", "14", "Contravention of visa/permit conditions by a foreigner", "foreigners", None, 5, 1, "non-bailable", "cognizable", "non-compoundable", "Overstay/illegal entry cases"),
    ("Passports Act, 1967", "12", "Using/possessing a fraudulently obtained passport", "foreigners", None, 7, 1, "non-bailable", "cognizable", "non-compoundable", None),
    ("Narcotic Drugs and Psychotropic Substances Act, 1985", "20", "Possession/sale of cannabis-based narcotics", "economic", None, 10, 1, "non-bailable", "cognizable", "non-compoundable", "Sec 37 NDPS imposes stringent twin conditions for bail; varies by quantity (small/intermediate/commercial)"),
]

cur.executemany("""
INSERT INTO special_acts_offenses (act_name, section, offense_name, category, min_punishment_years,
    max_punishment_years, fine_applicable, bailable, cognizable, compoundable, notes)
VALUES (?,?,?,?,?,?,?,?,?,?,?)
""", special)

# -------------------------------------------------------------------
# 3. JUDGMENTS  (plain-language summaries, not verbatim quotes)
# -------------------------------------------------------------------
judgments = [
    ("Hussainara Khatoon v. State of Bihar", "1979 AIR 1369", 1979, "Supreme Court of India",
     "Established that prolonged pre-trial detention of undertrials violates the right to a speedy trial under Article 21, and directed release of undertrials who had already been in custody longer than the maximum sentence for their alleged offense.",
     "general,economic,women,children"),
    ("Arnesh Kumar v. State of Bihar", "(2014) 8 SCC 273", 2014, "Supreme Court of India",
     "Laid down guidelines requiring police to justify arrest in cases punishable with imprisonment up to 7 years (e.g., many Section 498A cases), directing magistrates to scrutinize the necessity of both arrest and further detention.",
     "women,general"),
    ("Satender Kumar Antil v. CBI", "(2022) 10 SCC 51", 2022, "Supreme Court of India",
     "Classified offenses into categories to guide bail decisions and emphasized that bail should be the rule and jail the exception, directing courts and police to avoid routine/mechanical arrests and detention.",
     "general,economic,cyber,women"),
    ("Gurbaksh Singh Sibbia v. State of Punjab", "1980 AIR 1632", 1980, "Supreme Court of India",
     "Clarified the scope of anticipatory bail under Section 438 CrPC, holding that courts should not impose unnecessarily rigid conditions and that personal liberty should weigh heavily in such applications.",
     "general,economic"),
    ("State of Rajasthan v. Balchand", "1977 AIR 2447", 1977, "Supreme Court of India",
     "Articulated the principle that the basic rule is bail, not jail, absent circumstances suggesting the accused would abscond, tamper with evidence, or repeat the offense.",
     "general"),
    ("Sanjay Chandra v. CBI", "(2012) 1 SCC 40", 2012, "Supreme Court of India",
     "Held that in economic offense cases, the seriousness of the charge alone should not override considerations like the accused's roots in the community, absence of flight risk, and prolonged pretrial incarceration.",
     "economic"),
    ("Manoj Kumar Khokhar v. State of Rajasthan", "(2022) 3 SCC 501", 2022, "Supreme Court of India",
     "Discussed the twin conditions for bail under special statutes such as the NDPS Act and reiterated the approach courts should take when a statute restricts ordinary bail principles.",
     "economic,general"),
    ("Nikesh Tarachand Shah v. Union of India", "(2018) 11 SCC 1", 2018, "Supreme Court of India",
     "Struck down the twin conditions for bail under Section 45 PMLA as unconstitutional at the time (later reinstated by amendment), illustrating how special-statute bail conditions can differ sharply from ordinary CrPC/BNSS bail.",
     "economic"),
    ("Zahira Habibulla Sheikh v. State of Gujarat", "(2004) 4 SCC 158", 2004, "Supreme Court of India",
     "Emphasized the need to protect witnesses from intimidation and tampering, a principle courts routinely weigh when assessing whether an accused released on bail might influence witnesses.",
     "general,women,sc_st"),
    ("Central Bureau of Investigation v. V. Vijay Sai Reddy", "(2013) 7 SCC 452", 2013, "Supreme Court of India",
     "Reiterated that in economic offenses involving deep-rooted conspiracies and public money, courts must weigh the gravity of the offense and its impact on society when deciding bail, alongside the accused's liberty interests.",
     "economic"),
]

cur.executemany("""
INSERT INTO judgments (case_name, citation, year, court, principle_summary, applicable_categories)
VALUES (?,?,?,?,?,?)
""", judgments)

# -------------------------------------------------------------------
# 4. PROCEDURAL CHECKLIST
# -------------------------------------------------------------------
checklist = [
    ("general", "regular", "Personal bond executed by the accused", 1),
    ("general", "regular", "Surety bond(s) from one or two sureties with proof of solvency/local address", 1),
    ("general", "regular", "Identity proof (Aadhaar/Voter ID/Passport)", 1),
    ("general", "regular", "Address verification of accused and sureties", 1),
    ("general", "regular", "Undertaking to attend all court dates and not leave jurisdiction without permission", 1),
    ("general", "anticipatory", "Application under Sec 438 CrPC / Sec 482 BNSS with grounds for apprehension of arrest", 1),
    ("general", "anticipatory", "Undertaking to cooperate with investigation", 1),
    ("general", "default/statutory", "Proof that charge sheet/investigation not completed within statutory period (60/90 days)", 1),
    ("women", "regular", "Additional scrutiny per Arnesh Kumar guidelines for offenses punishable up to 7 years", 1),
    ("women", "regular", "Protection order compliance check (if Domestic Violence Act involved)", 0),
    ("children", "regular", "Compliance with POCSO-specific bail conditions (no contact with victim/witnesses)", 1),
    ("children", "regular", "Child Welfare Committee / Special Court concurrence where applicable", 0),
    ("sc_st", "regular", "Additional conditions under Sec 18/18A SC/ST (POA) Act — anticipatory bail may be barred", 1),
    ("economic", "regular", "Twin conditions (if PMLA/NDPS applicable): public prosecutor opportunity to oppose + court satisfaction of prima facie innocence", 1),
    ("economic", "regular", "Proof of no risk of tampering financial records/absconding with assets", 1),
    ("cyber", "regular", "Preservation undertaking for digital evidence / no access to compromised systems", 1),
    ("state", "regular", "UAPA Sec 43D(5) — bail restricted if prima facie case found true on record; requires detailed judicial scrutiny", 1),
    ("foreigners", "regular", "Passport/visa status verification with FRRO", 1),
    ("foreigners", "regular", "Undertaking not to leave India without court/FRRO permission", 1),
]

cur.executemany("""
INSERT INTO procedural_checklist (category, bail_type, requirement, is_mandatory)
VALUES (?,?,?,?)
""", checklist)

# -------------------------------------------------------------------
# 5. CUSTODY / STATUTORY RELEASE RULES
# -------------------------------------------------------------------
custody_rules = [
    ("Half-of-maximum-sentence undertrial release", "Section 436A CrPC / Section 479 BNSS 2023",
     "An undertrial who has served one-half of the maximum period of imprisonment prescribed for the offense "
     "(and is not accused of an offense punishable by death) is ordinarily entitled to release on personal bond, "
     "with or without sureties, at the court's discretion.",
     0.5, "all",
     "Excludes offenses punishable with death. BNS 2023/BNSS 479 additionally provides for first-time offenders "
     "(no prior conviction) to be released on bond after serving one-third of the maximum sentence — verify exact "
     "text before relying on this."),
    ("First-time-offender one-third release", "Section 479 BNSS 2023 (proviso)",
     "First-time offenders (with no previous conviction) who have served one-third of the maximum prescribed "
     "sentence may be released on bond, a more lenient threshold than the general half-term rule.",
     0.333, "first_time_offender",
     "New provision introduced in BNSS 2023, does not have a direct one-to-one predecessor in old Sec 436A CrPC."),
    ("Default/Statutory bail", "Section 167(2) CrPC / Section 187 BNSS 2023",
     "If police fail to complete investigation and file a charge sheet within 60 days (offenses punishable up to "
     "10 years) or 90 days (offenses punishable with death/life/10+ years), the accused becomes entitled to bail "
     "as a matter of right, provided they are prepared to furnish bail.",
     None, "all",
     "This is an independent right distinct from the half-sentence-served rule; time-bound to the investigation stage only."),
]

cur.executemany("""
INSERT INTO custody_rules (rule_name, source_provision, description, threshold_fraction, applies_to, exclusion_notes)
VALUES (?,?,?,?,?,?)
""", custody_rules)

conn.commit()

# -------------------------------------------------------------------
# Sanity check / summary
# -------------------------------------------------------------------
for table in ["offenses", "special_acts_offenses", "judgments", "procedural_checklist", "custody_rules"]:
    n = cur.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
    print(f"{table}: {n} rows")

conn.close()
print(f"\nDatabase created at: {DB_PATH}")
