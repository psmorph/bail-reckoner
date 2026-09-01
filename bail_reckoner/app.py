from __future__ import annotations
import json
from pathlib import Path
import streamlit as st
from engine import custody_days, database_stats, rule_assessment, search_cases

st.set_page_config(page_title="Bail Reckoner", layout="wide")
ROOT = Path(__file__).parent
st.title("Bail Reckoner")
st.caption("Explainable legal-information retrieval and issue spotting")
st.warning("This system does not predict, approve, reject, or guarantee bail. It is not legal advice. Verify every provision and judgment with current authoritative sources and a qualified legal professional.")

page = st.sidebar.radio("View", ["Case review", "Search judgments", "Dataset statistics", "Model evaluation"])

if page == "Case review":
    st.header("Case input")
    with st.form("case_form"):
        sections = st.text_input("IPC/BNS sections", placeholder="302, 34 or 103(1)")
        special_laws = st.text_input("Special-law sections", placeholder="POCSO 6; NDPS 20; UAPA 18")
        bail_type = st.selectbox("Bail type", ["Regular", "Anticipatory", "Default/statutory", "Interim"])
        arrest = st.date_input("Arrest date")
        charge_sheet = st.checkbox("Charge-sheet filed")
        first_time = st.checkbox("First-time offender")
        risks = st.multiselect("Recorded risk factors", ["flight", "witness", "evidence"])
        query = st.text_area("Case facts and legal issues", height=150)
        top_k = st.slider("Similar judgments", 5, 10, 5)
        submitted = st.form_submit_button("Review case")
    if submitted:
        days = custody_days(arrest)
        st.metric("Custody period", f"{days} days")
        assessment = rule_assessment(sections, special_laws, bail_type, days, charge_sheet, first_time, "flight" in risks, "witness" in risks, "evidence" in risks)
        st.subheader("Rule-based review triggers")
        for trigger in assessment["triggers"]: st.info(trigger)
        st.subheader("Similar judgments")
        for row in search_cases(query or f"{sections} {special_laws}", top_k):
            with st.expander(f"{row.get('case_title')} | similarity {row.get('similarity')}"):
                st.write(f"**Court:** {row.get('court')}  | **Date:** {row.get('date')}  | **Bail:** {row.get('bail_type')}  | **Outcome in source:** {row.get('bail_outcome')}")
                st.write(f"**Sections:** {row.get('ipc_sections')}  | **Special laws:** {row.get('special_laws')}")
                st.write("**Facts:**", row.get("facts")); st.write("**Reasoning:**", row.get("judgment_reason"))

elif page == "Search judgments":
    st.header("Search and filter")
    query = st.text_input("Describe the case", "prolonged custody and delayed trial")
    court = st.text_input("Court filter"); offence = st.text_input("IPC/BNS section or offence text")
    bail = st.selectbox("Bail type", ["All", "Regular", "Anticipatory", "Interim"]); outcome = st.selectbox("Outcome", ["All", "Granted", "Rejected"])
    year = st.text_input("Year", placeholder="2023")
    filters = {"court": court, "ipc_sections": offence, "bail_type": bail, "bail_outcome": outcome, "year": year}
    for row in search_cases(query, 10, filters):
        st.write(f"**{row.get('case_title')}** | {row.get('court')} | {row.get('date')} | {row.get('bail_type')} | {row.get('bail_outcome')} | similarity `{row.get('similarity')}`")
        st.caption(row.get("summary") or row.get("judgment_reason"))

elif page == "Dataset statistics":
    st.header("Dataset statistics")
    report = ROOT / "data" / "preprocessing_report.json"
    if report.exists(): st.json(json.loads(report.read_text(encoding="utf-8")))
    else: st.info("Run prepare_data.py first.")
    st.json(database_stats())

else:
    st.header("Experimental model evaluation")
    st.error("Do not use an outcome model for legal decisions. Retrieval is the recommended approach.")
    result = ROOT / "data" / "evaluation.json"
    if result.exists(): st.json(json.loads(result.read_text(encoding="utf-8")))
    else: st.info("Run evaluate.py after preparing the dataset.")
