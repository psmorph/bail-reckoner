import sqlite3
from pathlib import Path
from datetime import date, datetime


# ============================================================
# BAIL RECKONER - MVP ENGINE
# ============================================================
#
# Purpose:
# Preliminary legal-information and bail-screening engine.
#
# IMPORTANT:
# This tool does NOT grant, deny, or predict bail.
# It identifies database-recorded legal/procedural triggers
# that may require review by a qualified legal professional
# or judicial authority.
#
# ============================================================


# ============================================================
# DATABASE CONFIGURATION
# ============================================================

DB_PATH = Path(__file__).parent / "bail_reckoner.db"


# ============================================================
# DATABASE CONNECTION
# ============================================================

def get_connection():
    """Connect to the Bail Reckoner SQLite database."""

    if not DB_PATH.exists():
        raise FileNotFoundError(
            f"Database not found:\n{DB_PATH}"
        )

    connection = sqlite3.connect(DB_PATH)

    # Allows access to columns by name
    connection.row_factory = sqlite3.Row

    return connection


# ============================================================
# OFFENCE LOOKUP
# ============================================================

def get_offence(section):
    """
    Search the main offenses table using either
    IPC or BNS section.
    """

    section = str(section).strip()

    if not section:
        return None

    connection = get_connection()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                id,
                ipc_section,
                bns_section,
                offense_name,
                category,
                min_punishment_years,
                max_punishment_years,
                fine_applicable,
                death_or_life,
                bailable,
                cognizable,
                compoundable,
                triable_by,
                notes
            FROM offenses
            WHERE TRIM(ipc_section) = ?
               OR TRIM(bns_section) = ?
            LIMIT 1
            """,
            (section, section)
        )

        row = cursor.fetchone()

        if row is None:
            return None

        return dict(row)

    finally:

        connection.close()


# ============================================================
# SPECIAL ACT LOOKUP
# ============================================================

def get_special_act_offence(section):
    """
    Search special_acts_offenses table.

    Example:
    POCSO
    SC/ST Act
    IT Act
    etc.
    """

    section = str(section).strip()

    if not section:
        return None

    connection = get_connection()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                id,
                act_name,
                section,
                offense_name,
                category,
                min_punishment_years,
                max_punishment_years,
                fine_applicable,
                bailable,
                cognizable,
                compoundable,
                notes
            FROM special_acts_offenses
            WHERE TRIM(section) = ?
            LIMIT 1
            """,
            (section,)
        )

        row = cursor.fetchone()

        if row is None:
            return None

        return dict(row)

    finally:

        connection.close()


# ============================================================
# DATE PARSER
# ============================================================

def parse_date(date_string):
    """
    Convert DD/MM/YYYY or YYYY-MM-DD into a date object.
    """

    if isinstance(date_string, datetime):

        return date_string.date()

    if isinstance(date_string, date):

        return date_string

    date_string = str(date_string).strip()

    formats = [
        "%d/%m/%Y",
        "%Y-%m-%d"
    ]

    for fmt in formats:

        try:

            return datetime.strptime(
                date_string,
                fmt
            ).date()

        except ValueError:
            continue

    raise ValueError(
        "Invalid date. Please use DD/MM/YYYY."
    )


# ============================================================
# CUSTODY CALCULATION
# ============================================================

def calculate_custody_days(
    arrest_date,
    calculation_date=None
):
    """
    Calculate days between arrest and calculation date.
    """

    arrest_date = parse_date(arrest_date)

    if calculation_date is None:

        calculation_date = date.today()

    else:

        calculation_date = parse_date(
            calculation_date
        )

    if arrest_date > calculation_date:

        raise ValueError(
            "Arrest date cannot be in the future."
        )

    return (
        calculation_date - arrest_date
    ).days


# ============================================================
# CUSTODY RULES
# ============================================================

def get_custody_rules():
    """
    Retrieve custody rules stored in the database.
    """

    connection = get_connection()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                id,
                rule_name,
                source_provision,
                description,
                threshold_fraction,
                applies_to,
                exclusion_notes
            FROM custody_rules
            ORDER BY id
            """
        )

        rows = cursor.fetchall()

        return [
            dict(row)
            for row in rows
        ]

    finally:

        connection.close()


# ============================================================
# PROCEDURAL CHECKLIST
# ============================================================

def get_procedural_checklist(
    category=None,
    bail_type=None
):
    """
    Retrieve procedural requirements from database.
    """

    connection = get_connection()

    try:

        cursor = connection.cursor()

        query = """
            SELECT
                id,
                category,
                bail_type,
                requirement,
                is_mandatory
            FROM procedural_checklist
            WHERE 1 = 1
        """

        parameters = []

        if category:

            query += """
                AND LOWER(category) = LOWER(?)
            """

            parameters.append(category)

        if bail_type:

            query += """
                AND LOWER(bail_type) = LOWER(?)
            """

            parameters.append(bail_type)

        query += """
            ORDER BY id
        """

        cursor.execute(
            query,
            parameters
        )

        rows = cursor.fetchall()

        return [
            dict(row)
            for row in rows
        ]

    finally:

        connection.close()


# ============================================================
# BAIL ELIGIBILITY ASSESSMENT
# ============================================================

def assess_bail_eligibility(
    charges,
    custody_days,
    first_time_offender=False
):
    """
    Preliminary assessment using the rules stored
    in the database.

    This does NOT make a judicial decision.
    """

    assessment = {

        "bailable_offence": False,

        "death_or_life_offence": False,

        "half_term_triggered": False,

        "one_third_triggered": False,

        "reasons": [],

        "warnings": []
    }

    # --------------------------------------------------------
    # No charges
    # --------------------------------------------------------

    if not charges:

        assessment["warnings"].append(
            "No charges were provided."
        )

        return assessment

    # --------------------------------------------------------
    # Examine every charge
    # --------------------------------------------------------

    for charge in charges:

        bailable = str(
            charge.get(
                "bailable",
                ""
            )
        ).lower()

        death_or_life = charge.get(
            "death_or_life"
        )

        if bailable == "bailable":

            assessment[
                "bailable_offence"
            ] = True

        if death_or_life == 1:

            assessment[
                "death_or_life_offence"
            ] = True

    # --------------------------------------------------------
    # Death/life warning
    # --------------------------------------------------------

    if assessment[
        "death_or_life_offence"
    ]:

        assessment["warnings"].append(

            "At least one charge is marked as "
            "punishable with death or life imprisonment. "
            "The ordinary half-term / one-third calculation "
            "must not be automatically applied."
        )

    # --------------------------------------------------------
    # Find maximum sentence
    # --------------------------------------------------------

    maximum_sentences = []

    for charge in charges:

        maximum = charge.get(
            "max_punishment_years"
        )

        if maximum is not None:

            try:

                maximum_sentences.append(
                    float(maximum)
                )

            except (
                TypeError,
                ValueError
            ):

                pass

    # --------------------------------------------------------
    # Half-term rule
    # --------------------------------------------------------

    if maximum_sentences:

        highest_maximum = max(
            maximum_sentences
        )

        half_term_days = (
            highest_maximum
            * 365.25
            * 0.5
        )

        if (
            not assessment[
                "death_or_life_offence"
            ]
            and custody_days >= half_term_days
        ):

            assessment[
                "half_term_triggered"
            ] = True

            assessment["reasons"].append(

                "Custody period has reached at least "
                "one-half of the maximum sentence recorded "
                "in the database."
            )

        # ----------------------------------------------------
        # One-third rule
        # ----------------------------------------------------

        one_third_days = (
            highest_maximum
            * 365.25
            * 0.333
        )

        if (
            first_time_offender
            and not assessment[
                "death_or_life_offence"
            ]
            and custody_days >= one_third_days
        ):

            assessment[
                "one_third_triggered"
            ] = True

            assessment["reasons"].append(

                "The accused is marked as a first-time "
                "offender and custody has reached at least "
                "one-third of the recorded maximum sentence."
            )

    # --------------------------------------------------------
    # General reasons
    # --------------------------------------------------------

    if assessment[
        "bailable_offence"
    ]:

        assessment["reasons"].append(

            "At least one charged offence is marked "
            "bailable in the database."
        )

    elif assessment[
        "half_term_triggered"
    ]:

        assessment["reasons"].append(

            "Potential statutory custody-threshold "
            "eligibility identified."
        )

    elif assessment[
        "one_third_triggered"
    ]:

        assessment["reasons"].append(

            "Potential first-time-offender "
            "custody-threshold eligibility identified."
        )

    else:

        assessment["reasons"].append(

            "No custody-threshold eligibility was "
            "identified from the currently recorded rules."
        )

    return assessment


# ============================================================
# DEFAULT / STATUTORY BAIL
# ============================================================

def assess_default_bail(
    arrest_date,
    chargesheet_filed,
    chargesheet_date=None,
    death_or_life_offence=False
):
    """
    Preliminary investigation-period assessment.

    Uses the simplified thresholds currently recorded
    in the Bail Reckoner database.
    """

    result = {

        "threshold_days": None,

        "days_elapsed": None,

        "potentially_eligible": False,

        "reason": "",

        "warning": None
    }

    # --------------------------------------------------------
    # Threshold
    # --------------------------------------------------------

    if death_or_life_offence:

        threshold_days = 90

    else:

        threshold_days = 60

    result[
        "threshold_days"
    ] = threshold_days

    # --------------------------------------------------------
    # Arrest date
    # --------------------------------------------------------

    try:

        arrest_date = parse_date(
            arrest_date
        )

    except ValueError as error:

        result[
            "warning"
        ] = str(error)

        return result

    # --------------------------------------------------------
    # Charge sheet filed
    # --------------------------------------------------------

    if chargesheet_filed:

        if not chargesheet_date:

            result[
                "warning"
            ] = (
                "Charge sheet is marked as filed, "
                "but no filing date was provided."
            )

            return result

        try:

            chargesheet_date = parse_date(
                chargesheet_date
            )

        except ValueError as error:

            result[
                "warning"
            ] = str(error)

            return result

        if chargesheet_date < arrest_date:

            result[
                "warning"
            ] = (
                "Charge-sheet date cannot be earlier "
                "than the arrest date."
            )

            return result

        days_elapsed = (
            chargesheet_date
            - arrest_date
        ).days

    # --------------------------------------------------------
    # Charge sheet not filed
    # --------------------------------------------------------

    else:

        days_elapsed = (
            date.today()
            - arrest_date
        ).days

    result[
        "days_elapsed"
    ] = days_elapsed

    # --------------------------------------------------------
    # Threshold test
    # --------------------------------------------------------

    if days_elapsed >= threshold_days:

        result[
            "potentially_eligible"
        ] = True

        result[
            "reason"
        ] = (

            f"The recorded investigation period is "
            f"{days_elapsed} days, which meets or exceeds "
            f"the {threshold_days}-day database threshold."
        )

    else:

        remaining = (
            threshold_days
            - days_elapsed
        )

        result[
            "reason"
        ] = (

            f"The recorded investigation period is "
            f"{days_elapsed} days. Approximately "
            f"{remaining} more days remain before the "
            f"{threshold_days}-day database threshold."
        )

    return result


# ============================================================
# JUDICIAL DISCRETION / RISK ASSESSMENT
# ============================================================

def assess_risk(
    flight_risk,
    witness_risk,
    evidence_risk,
    previous_record
):
    """
    Structured risk-factor assessment.

    This is NOT a prediction of judicial outcome.
    """

    risk_score = 0

    factors = []

    # --------------------------------------------------------
    # Flight risk
    # --------------------------------------------------------

    if flight_risk == "high":

        risk_score += 2

        factors.append(
            "High flight/absconding risk reported."
        )

    elif flight_risk == "medium":

        risk_score += 1

        factors.append(
            "Moderate flight/absconding risk reported."
        )

    # --------------------------------------------------------
    # Witness risk
    # --------------------------------------------------------

    if witness_risk == "high":

        risk_score += 2

        factors.append(
            "High risk of influencing or threatening witnesses."
        )

    elif witness_risk == "medium":

        risk_score += 1

        factors.append(
            "Moderate risk of influencing witnesses."
        )

    # --------------------------------------------------------
    # Evidence risk
    # --------------------------------------------------------

    if evidence_risk == "high":

        risk_score += 2

        factors.append(
            "High risk of tampering with evidence."
        )

    elif evidence_risk == "medium":

        risk_score += 1

        factors.append(
            "Moderate risk of tampering with evidence."
        )

    # --------------------------------------------------------
    # Previous record
    # --------------------------------------------------------

    if previous_record == "yes":

        risk_score += 2

        factors.append(
            "Previous criminal record reported."
        )

    # --------------------------------------------------------
    # Overall risk
    # --------------------------------------------------------

    if risk_score >= 5:

        risk_level = "HIGH"

    elif risk_score >= 2:

        risk_level = "MEDIUM"

    else:

        risk_level = "LOW"

    return {

        "score": risk_score,

        "level": risk_level,

        "factors": factors
    }


# ============================================================
# PRINT CHARGE INFORMATION
# ============================================================

def print_charges(charges):

    print("\n")
    print("=" * 60)
    print("CASE CHARGES")
    print("=" * 60)

    if not charges:

        print("No charges were added.")

        return

    for number, charge in enumerate(
        charges,
        start=1
    ):

        print(
            f"\nCharge {number}"
        )

        print("-" * 40)

        print(
            "Offence       :",
            charge.get(
                "offense_name"
            )
        )

        print(
            "IPC Section   :",
            charge.get(
                "ipc_section"
            )
        )

        print(
            "BNS Section   :",
            charge.get(
                "bns_section"
            )
        )

        print(
            "Category      :",
            charge.get(
                "category"
            )
        )

        print(
            "Bailable      :",
            charge.get(
                "bailable"
            )
        )

        print(
            "Cognizable    :",
            charge.get(
                "cognizable"
            )
        )

        print(
            "Compoundable  :",
            charge.get(
                "compoundable"
            )
        )

        print(
            "Triable By    :",
            charge.get(
                "triable_by"
            )
        )

        print(
            "Min Punishment:",
            charge.get(
                "min_punishment_years"
            )
        )

        print(
            "Max Punishment:",
            charge.get(
                "max_punishment_years"
            )
        )

        print(
            "Death/Life    :",
            charge.get(
                "death_or_life"
            )
        )

        print(
            "Notes         :",
            charge.get(
                "notes"
            )
        )


# ============================================================
# PRINT PROCEDURAL CHECKLIST
# ============================================================

def print_procedural_checklist():

    print("\n")
    print("=" * 60)
    print("PROCEDURAL CHECKLIST")
    print("=" * 60)

    checklist = get_procedural_checklist()

    if not checklist:

        print(
            "No procedural requirements found "
            "in the database."
        )

        return

    for item in checklist:

        mandatory = (
            "MANDATORY"
            if item["is_mandatory"]
            else "IF APPLICABLE"
        )

        print(
            f"\n[{mandatory}] "
            f"{item['requirement']}"
        )

        print(
            "Category :",
            item["category"]
        )

        print(
            "Bail type:",
            item["bail_type"]
        )


# ============================================================
# MAIN PROGRAM
# ============================================================

def main():

    print("=" * 60)
    print("BAIL RECKONER")
    print("PRELIMINARY BAIL ASSESSMENT ENGINE")
    print("=" * 60)

    print(
        "\nDatabase location:"
    )

    print(DB_PATH)

    # --------------------------------------------------------
    # Database check
    # --------------------------------------------------------

    if not DB_PATH.exists():

        print(
            "\nERROR: Database not found."
        )

        print(
            "Expected:"
        )

        print(DB_PATH)

        return

    print(
        "Database found successfully."
    )

    # --------------------------------------------------------
    # ENTER CHARGES
    # --------------------------------------------------------

    charges = []

    print("\n")
    print("=" * 60)
    print("CHARGE INPUT")
    print("=" * 60)

    print(
        "\nEnter BNS or IPC sections one at a time."
    )

    print(
        "When finished, type: done"
    )

    while True:

        section = input(
            "\nEnter BNS/IPC section: "
        ).strip()

        if section.lower() == "done":

            break

        if not section:

            print(
                "Please enter a section."
            )

            continue

        # ----------------------------------------------------
        # Search main offences table
        # ----------------------------------------------------

        offence = get_offence(
            section
        )

        if offence is not None:

            charges.append(
                offence
            )

            print(
                "Added:",
                offence["offense_name"]
            )

            continue

        # ----------------------------------------------------
        # Search special acts table
        # ----------------------------------------------------

        special_offence = (
            get_special_act_offence(
                section
            )
        )

        if special_offence is not None:

            # Convert special-act record into
            # a structure compatible with
            # the assessment engine.

            special_offence[
                "ipc_section"
            ] = None

            special_offence[
                "bns_section"
            ] = special_offence[
                "section"
            ]

            special_offence[
                "death_or_life"
            ] = 0

            special_offence[
                "triable_by"
            ] = None

            charges.append(
                special_offence
            )

            print(
                "Added special-act offence:",
                special_offence[
                    "offense_name"
                ]
            )

            continue

        print(
            f"No offence found for section "
            f"'{section}'."
        )

    # --------------------------------------------------------
    # Display charges
    # --------------------------------------------------------

    print_charges(
        charges
    )

    # --------------------------------------------------------
    # Arrest date
    # --------------------------------------------------------

    print("\n")
    print("=" * 60)
    print("CUSTODY CALCULATION")
    print("=" * 60)

    arrest_date = input(
        "\nEnter date of arrest (DD/MM/YYYY): "
    ).strip()

    try:

        custody_days = (
            calculate_custody_days(
                arrest_date
            )
        )

        custody_years = (
            custody_days / 365.25
        )

        print(
            "\nCustody Information"
        )

        print("-" * 40)

        print(
            "Date of arrest :",
            arrest_date
        )

        print(
            "Calculation date:",
            date.today().strftime(
                "%d/%m/%Y"
            )
        )

        print(
            "Days served    :",
            custody_days
        )

        print(
            "Approx. years  :",
            round(
                custody_years,
                2
            )
        )

    except ValueError as error:

        print(
            "\nERROR:",
            error
        )

        return

    # --------------------------------------------------------
    # First-time offender
    # --------------------------------------------------------

    print("\n")

    first_time_input = input(
        "Is the accused a first-time offender? "
        "(yes/no): "
    ).strip().lower()

    first_time_offender = (
        first_time_input
        in ["yes", "y"]
    )

    # --------------------------------------------------------
    # Preliminary bail assessment
    # --------------------------------------------------------

    assessment = (
        assess_bail_eligibility(
            charges=charges,
            custody_days=custody_days,
            first_time_offender=
                first_time_offender
        )
    )

    print("\n")
    print("=" * 60)
    print("PRELIMINARY BAIL ASSESSMENT")
    print("=" * 60)

    print(
        "\nBailable offence identified:",
        "YES"
        if assessment[
            "bailable_offence"
        ]
        else "NO"
    )

    print(
        "Death/life imprisonment charge:",
        "YES"
        if assessment[
            "death_or_life_offence"
        ]
        else "NO"
    )

    print(
        "Half-term threshold:",
        "TRIGGERED"
        if assessment[
            "half_term_triggered"
        ]
        else "NOT TRIGGERED"
    )

    print(
        "First-time offender "
        "one-third threshold:",
        "TRIGGERED"
        if assessment[
            "one_third_triggered"
        ]
        else "NOT TRIGGERED"
    )

    print("\nReasons:")

    for reason in assessment[
        "reasons"
    ]:

        print(
            "-",
            reason
        )

    if assessment[
        "warnings"
    ]:

        print("\nWarnings:")

        for warning in assessment[
            "warnings"
        ]:

            print(
                "-",
                warning
            )

    # --------------------------------------------------------
    # DEFAULT BAIL
    # --------------------------------------------------------

    print("\n")
    print("=" * 60)
    print("DEFAULT / STATUTORY BAIL")
    print("=" * 60)

    chargesheet_input = input(
        "\nHas the charge sheet been filed? "
        "(yes/no): "
    ).strip().lower()

    chargesheet_filed = (
        chargesheet_input
        in ["yes", "y"]
    )

    chargesheet_date = None

    if chargesheet_filed:

        chargesheet_date = input(
            "Enter charge-sheet filing date "
            "(DD/MM/YYYY): "
        ).strip()

    default_bail = (
        assess_default_bail(
            arrest_date=arrest_date,
            chargesheet_filed=
                chargesheet_filed,
            chargesheet_date=
                chargesheet_date,
            death_or_life_offence=
                assessment[
                    "death_or_life_offence"
                ]
        )
    )

    print("\nDefault Bail Assessment")

    print("-" * 60)

    print(
        "Applicable database threshold:",
        default_bail[
            "threshold_days"
        ],
        "days"
    )

    if default_bail[
        "days_elapsed"
    ] is not None:

        print(
            "Investigation period:",
            default_bail[
                "days_elapsed"
            ],
            "days"
        )

    if default_bail[
        "potentially_eligible"
    ]:

        print(
            "Potential default-bail trigger: YES"
        )

    else:

        print(
            "Potential default-bail trigger: NO"
        )

    print(
        "\nReason:",
        default_bail[
            "reason"
        ]
    )

    if default_bail[
        "warning"
    ]:

        print(
            "\nWarning:",
            default_bail[
                "warning"
            ]
        )

    # --------------------------------------------------------
    # JUDICIAL FACTORS
    # --------------------------------------------------------

    print("\n")
    print("=" * 60)
    print("JUDICIAL DISCRETION FACTORS")
    print("=" * 60)

    print(
        "\nEnter: low / medium / high"
    )

    flight_risk = input(
        "\nRisk of accused "
        "escaping/absconding: "
    ).strip().lower()

    witness_risk = input(
        "Risk of influencing witnesses: "
    ).strip().lower()

    evidence_risk = input(
        "Risk of tampering with evidence: "
    ).strip().lower()

    previous_record = input(
        "Previous criminal record? "
        "(yes/no): "
    ).strip().lower()

    risk_result = assess_risk(
        flight_risk=flight_risk,
        witness_risk=witness_risk,
        evidence_risk=evidence_risk,
        previous_record=previous_record
    )

    print("\nRisk Assessment")

    print("-" * 60)

    print(
        "Overall risk level:",
        risk_result[
            "level"
        ]
    )

    print(
        "Risk score:",
        risk_result[
            "score"
        ]
    )

    if risk_result[
        "factors"
    ]:

        print(
            "\nFactors requiring "
            "legal/judicial review:"
        )

        for factor in risk_result[
            "factors"
        ]:

            print(
                "-",
                factor
            )

    else:

        print(
            "\nNo elevated risk factors "
            "were reported."
        )

    # --------------------------------------------------------
    # PROCEDURAL CHECKLIST
    # --------------------------------------------------------

    print_procedural_checklist()

    # --------------------------------------------------------
    # FINAL SUMMARY
    # --------------------------------------------------------

    print("\n")
    print("=" * 60)
    print("FINAL BAIL RECKONER SUMMARY")
    print("=" * 60)

    print(
        "\nNumber of charges:",
        len(charges)
    )

    print(
        "Custody period:",
        custody_days,
        "days"
    )

    print(
        "First-time offender:",
        "YES"
        if first_time_offender
        else "NO"
    )

    print(
        "\nCustody-threshold trigger:",
        "YES"
        if (
            assessment[
                "half_term_triggered"
            ]
            or assessment[
                "one_third_triggered"
            ]
        )
        else "NO"
    )

    print(
        "Potential default-bail trigger:",
        "YES"
        if default_bail[
            "potentially_eligible"
        ]
        else "NO"
    )

    print(
        "Risk level:",
        risk_result[
            "level"
        ]
    )

    # --------------------------------------------------------
    # Final interpretation
    # --------------------------------------------------------

    print("\nPreliminary interpretation:")

    if default_bail[
        "potentially_eligible"
    ]:

        print(
            "- A potential default/statutory "
            "bail trigger has been identified."
        )

    if assessment[
        "bailable_offence"
    ]:

        print(
            "- At least one offence is recorded "
            "as bailable."
        )

    if assessment[
        "half_term_triggered"
    ]:

        print(
            "- The recorded custody period "
            "has crossed the half-term threshold."
        )

    if assessment[
        "one_third_triggered"
    ]:

        print(
            "- The first-time-offender "
            "one-third threshold has been triggered."
        )

    if (
        not default_bail[
            "potentially_eligible"
        ]
        and not assessment[
            "bailable_offence"
        ]
        and not assessment[
            "half_term_triggered"
        ]
        and not assessment[
            "one_third_triggered"
        ]
    ):

        print(
            "- No automatic statutory trigger "
            "was identified from the currently "
            "recorded database rules."
        )

    print("\n")
    print("=" * 60)
    print("IMPORTANT")
    print("=" * 60)

    print(
        "\nThis is a preliminary informational "
        "assessment based on the data and rules "
        "currently stored in the Bail Reckoner database."
    )

    print(
        "\nIt is NOT a judicial decision and does "
        "NOT guarantee bail eligibility or bail "
        "being granted."
    )

    print(
        "\nApplicable law, amendments, case facts, "
        "judicial discretion, and current court "
        "interpretation must be independently verified."
    )

    print(
        "\n" + "=" * 60
    )


# ============================================================
# PROGRAM ENTRY POINT
# ============================================================

if __name__ == "__main__":

    main()