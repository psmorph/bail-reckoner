import sqlite3
from datetime import date
from pathlib import Path
import streamlit as st

st.set_page_config(page_title="Bail Reckoner", page_icon="⚖", layout="wide")

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "bail_reckoner.db"

st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap');
html, body, [class*="css"] { font-family: "DM Sans", sans-serif; }
.stApp { background:#f7f7f5; }
.block-container { max-width:1180px; padding-top:2rem; padding-bottom:4rem; }
.hero { background:#17202a; color:white; border-radius:18px; padding:34px 38px; margin-bottom:26px; }
.kicker { text-transform:uppercase; letter-spacing:2px; font-size:12px; color:#c9a96e; font-weight:700; }
.hero h1 { font-family:"Playfair Display",serif; font-size:42px; margin:4px 0; }
.hero p { color:#d5dbe0; max-width:780px; }
.section { font-family:"Playfair Display",serif; font-size:28px; color:#17202a; margin:10px 0 16px; }
.card { background:white; border:1px solid #e2e4e7; border-radius:14px; padding:20px; margin-bottom:14px; }
.metric { background:white; border:1px solid #e2e4e7; border-radius:14px; padding:18px; }
.label { color:#66717d; font-size:12px; text-transform:uppercase; letter-spacing:.8px; }
.value { color:#17202a; font-size:26px; font-weight:700; margin-top:5px; }
.disclaimer { background:#fff8e9; border:1px solid #ead7a8; color:#5e4a24; border-radius:12px; padding:17px; margin-top:24px; font-size:13px; }
div[data-testid="stSidebar"] { background:#17202a; }
div[data-testid="stSidebar"] * { color:#edf0f2; }
</style>
""", unsafe_allow_html=True)

def conn():
    if not DB_PATH.exists():
        return None
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    return c

def one(sql, params=()):
    c = conn()
    if not c: return None
    try:
        r = c.execute(sql, params).fetchone()
        return dict(r) if r else None
    finally: c.close()

def many(sql, params=()):
    c = conn()
    if not c: return []
    try:
        return [dict(r) for r in c.execute(sql, params).fetchall()]
    finally: c.close()

def lookup(section):
    r = one("""SELECT * FROM offenses
               WHERE lower(ipc_section)=lower(?) OR lower(bns_section)=lower(?)
               LIMIT 1""", (section, section))
    if r:
        r["_source"] = "IPC / BNS"
        return r
    r = one("""SELECT * FROM special_acts_offenses
               WHERE lower(section)=lower(?) LIMIT 1""", (section,))
    if r:
        r["_source"] = "Special Act"
        r["death_or_life"] = 0
        return r
    return None

def days_in_custody(arrest):
    return max(0, (date.today() - arrest).days)

def assess(charges, days, first_time):
    bailable = any(str(c.get("bailable","")).lower()=="bailable" for c in charges)
    death = any(int(c.get("death_or_life") or 0)==1 for c in charges)
    finite = []
    for c in charges:
        try:
            v = float(c.get("max_punishment_years"))
            if v > 0: finite.append(v)
        except (TypeError, ValueError): pass

    result = {"bailable":bailable, "death":death,
              "half":False, "third":False, "reasons":[], "warnings":[]}

    if bailable:
        result["reasons"].append("At least one recorded charge is marked bailable in the database.")
    if death:
        result["warnings"].append(
            "A charge is recorded as punishable with death or life imprisonment. "
            "Ordinary custody-threshold calculations must not be treated as automatic."
        )

    if finite and not death:
        max_years = max(finite)
        if days >= max_years * 365.25 * .5:
            result["half"] = True
            result["reasons"].append(
                f"Custody reaches approximately one-half of the highest recorded maximum sentence ({max_years:g} years). Legal verification required."
            )
        if first_time and days >= max_years * 365.25 / 3:
            result["third"] = True
            result["reasons"].append(
                f"First-time-offender custody reaches approximately one-third of the highest recorded maximum sentence ({max_years:g} years). Legal verification required."
            )
    elif not finite:
        result["warnings"].append("A finite maximum sentence is not available for the threshold calculation.")

    if not result["reasons"]:
        result["reasons"].append("No custody-threshold trigger was identified from the currently recorded database information.")
    return result

if "charges" not in st.session_state: st.session_state.charges=[]
if "arrest" not in st.session_state: st.session_state.arrest=date.today()
if "first_time" not in st.session_state: st.session_state.first_time="No"
if "case_no" not in st.session_state: st.session_state.case_no=""

st.markdown("""
<div class="hero">
<div class="kicker">Digital Legal Information System</div>
<h1>Bail Reckoner</h1>
<p>Preliminary bail assessment and legal-information interface for structured offence, custody, procedural and judicial review.</p>
</div>
""", unsafe_allow_html=True)

with st.sidebar:
    st.markdown("## Bail Reckoner")
    page = st.radio("Navigate", ["Case Details","Charges","Custody & Investigation","Judicial Factors","Assessment"])
    st.divider()
    st.caption("● Database connected" if DB_PATH.exists() else "● Database not found")
    st.caption("Preliminary assessment only.")


def get_judgments(categories):
    rows=many("SELECT case_name,citation,year,court,principle_summary,applicable_categories FROM judgments ORDER BY year DESC")
    if not categories: return rows[:5]
    matched=[r for r in rows if any(c in (r.get("applicable_categories") or "").lower() for c in categories)]
    return (matched+[r for r in rows if r not in matched])[:5]

def get_checklist(categories):
    rows=many("SELECT category,bail_type,requirement,is_mandatory FROM procedural_checklist ORDER BY id")
    cats={c.lower() for c in categories}
    return [r for r in rows if (r.get("category") or "").lower()=="general" or (r.get("category") or "").lower() in cats]

if page == "Case Details":
    st.markdown('<div class="section">Case Details</div>', unsafe_allow_html=True)
    with st.container(border=True):
        a,b=st.columns(2)
        with a:
            st.session_state.case_no=st.text_input("Case / Reference Number", st.session_state.case_no)
            st.session_state.arrest=st.date_input("Date of Arrest", st.session_state.arrest)
        with b:
            st.session_state.first_time=st.selectbox("First-time offender?",["Yes","No"],index=0 if st.session_state.first_time=="Yes" else 1)
            st.selectbox("User type",["Undertrial Prisoner","Legal Aid Provider","Judicial / Court Staff","Other"])
    st.success("Case details recorded.")

elif page == "Charges":
    st.markdown('<div class="section">Charges & Offence Lookup</div>', unsafe_allow_html=True)
    a,b=st.columns([5,1])
    with a: section=st.text_input("BNS / IPC / Special Act section",placeholder="Example: 103(1) or 302")
    with b:
        st.write("")
        st.write("")
        add=st.button("Add",type="primary",use_container_width=True)
    if add:
        if not section.strip(): st.error("Enter a section.")
        else:
            r=lookup(section.strip())
            if r:
                st.session_state.charges.append(r)
                st.success(f"Added: {r.get('offense_name','Unknown')}")
            else: st.error("Section not found in the current database.")
    st.divider()
    if not st.session_state.charges: st.info("No charges added yet.")
    for i,c in enumerate(st.session_state.charges):
        with st.container(border=True):
            a,b,d=st.columns([4,4,1])
            with a:
                st.markdown(f"### {c.get('offense_name','Unknown')}")
                st.write(f"**IPC:** {c.get('ipc_section') or '—'}  |  **BNS:** {c.get('bns_section') or '—'}")
                if c.get("act_name"): st.write(f"**Act:** {c['act_name']} | **Section:** {c.get('section','—')}")
            with b:
                st.write(f"**Category:** {c.get('category') or '—'}")
                st.write(f"**Punishment:** {c.get('min_punishment_years') or '—'} to {c.get('max_punishment_years') or '—'} years")
                st.write(f"**Bailable:** {c.get('bailable') or '—'}")
                st.write(f"**Cognizable:** {c.get('cognizable') or '—'}")
                st.write(f"**Compoundable:** {c.get('compoundable') or '—'}")
            with d:
                if st.button("Remove",key=f"rm{i}"):
                    st.session_state.charges.pop(i); st.rerun()

elif page == "Custody & Investigation":
    st.markdown('<div class="section">Custody & Investigation</div>', unsafe_allow_html=True)
    days=days_in_custody(st.session_state.arrest)
    a,b,c=st.columns(3)
    for col,label,value in [(a,"Days in custody",days),(b,"Approx. years",f"{days/365.25:.2f}"),(c,"Arrest date",st.session_state.arrest.strftime("%d/%m/%Y"))]:
        with col:
            st.markdown(f'<div class="metric"><div class="label">{label}</div><div class="value">{value}</div></div>',unsafe_allow_html=True)
    st.write("")
    with st.container(border=True):
        st.session_state.charge_sheet=st.radio("Has the charge sheet been filed?",["No","Yes"],horizontal=True)
        if st.session_state.charge_sheet=="Yes":
            st.session_state.charge_sheet_date=st.date_input("Charge sheet filing date",date.today())

elif page == "Judicial Factors":
    st.markdown('<div class="section">Judicial Factors</div>', unsafe_allow_html=True)
    st.info("These are structured inputs for legal review, not a prediction of judicial behaviour.")
    a,b=st.columns(2)
    with a:
        flight=st.selectbox("Flight / absconding risk",["Low","Medium","High"])
        witness=st.selectbox("Witness influence risk",["Low","Medium","High"])
    with b:
        evidence=st.selectbox("Evidence tampering risk",["Low","Medium","High"])
        previous=st.selectbox("Previous criminal record",["No","Yes"])
    score={"Low":0,"Medium":1,"High":2}[flight]+{"Low":0,"Medium":1,"High":2}[witness]+{"Low":0,"Medium":1,"High":2}[evidence]+(1 if previous=="Yes" else 0)
    level="Low" if score<=2 else "Moderate" if score<=4 else "High"
    st.markdown(f'<div class="metric"><div class="label">Structured risk level</div><div class="value">{level}</div></div>',unsafe_allow_html=True)

elif page == "Assessment":
    st.markdown('<div class="section">Preliminary Bail Assessment</div>', unsafe_allow_html=True)
    if not st.session_state.charges:
        st.warning("Add at least one charge first."); st.stop()
    days=days_in_custody(st.session_state.arrest)
    r=assess(st.session_state.charges,days,st.session_state.first_time=="Yes")

    a,b,c,d=st.columns(4)
    vals=[("Charges",len(st.session_state.charges)),("Custody",f"{days} days"),("Bailable","YES" if r["bailable"] else "NO"),("Death / Life","YES" if r["death"] else "NO")]
    for col,(label,value) in zip([a,b,c,d],vals):
        with col: st.markdown(f'<div class="metric"><div class="label">{label}</div><div class="value">{value}</div></div>',unsafe_allow_html=True)

    st.write("")
    with st.container(border=True):
        st.markdown("### Statutory / Custody Review")
        x,y=st.columns(2)
        with x: st.success("Half-term trigger identified — legal review required") if r["half"] else st.info("Half-term trigger not identified")
        with y: st.success("One-third trigger identified — legal review required") if r["third"] else st.info("One-third trigger not identified")
        st.markdown("### Reasons")
        for x in r["reasons"]: st.write("• "+x)
        for x in r["warnings"]: st.warning(x)

    with st.container(border=True):
        st.markdown("### Procedural Checklist")
        cats={str(c.get("category")).lower() for c in st.session_state.charges if c.get("category")}
        rows=get_checklist(cats) if 'get_checklist' in globals() else []
        if not rows:
            st.info("No matching checklist entries found.")
        else:
            for i,row in enumerate(rows):
                st.checkbox(row.get("requirement",""),key=f"proc{i}")

    with st.container(border=True):
        st.markdown("### Relevant Judicial Pronouncements")
        cats={str(c.get("category")).lower() for c in st.session_state.charges if c.get("category")}
        rows=get_judgments(cats) if 'get_judgments' in globals() else []
        for j in rows:
            with st.expander(f"{j.get('case_name','Case')} • {j.get('year','')}"):
                st.write(f"**Citation:** {j.get('citation') or 'Not recorded'}")
                st.write(f"**Court:** {j.get('court') or 'Not recorded'}")
                st.write(j.get('principle_summary') or "Not recorded")

    st.markdown("""
    <div class="disclaimer"><strong>Important legal disclaimer</strong><br><br>
    This is a preliminary legal-information and case-structuring prototype. It does not determine entitlement to bail, predict a judicial outcome, or substitute for advice from a qualified legal professional. Current law, amendments, facts and judicial interpretation must be independently verified.
    </div>
    """,unsafe_allow_html=True)
