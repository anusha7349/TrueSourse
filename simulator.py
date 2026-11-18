"""
Core Financial Decision Engine
PS11 - Financial Decision Impact Simulator

Pure mathematical implementation of reducing-balance EMI, amortization schedules,
prepayment adjustments, missed payment compounding, and true cost calculations.
No third-party financial libraries used.
"""

from typing import Dict, List, Any, Optional
import math


def calculate_standard_emi(principal: float, annual_rate_pct: float, tenure_months: int) -> float:
    """
    Standard Equated Monthly Installment (EMI) formula:
    EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
    where:
      P = Principal loan amount
      r = Monthly interest rate (annual_rate_pct / 12 / 100)
      n = Tenure in months
    """
    if tenure_months <= 0:
        raise ValueError("Tenure must be greater than 0")
    if principal <= 0:
        return 0.0
    if annual_rate_pct == 0:
        return principal / tenure_months

    r = (annual_rate_pct / 100.0) / 12.0
    factor = (1.0 + r) ** tenure_months
    emi = principal * r * factor / (factor - 1.0)
    return emi


def calculate_amortization_schedule(
    principal: float,
    annual_rate_pct: float,
    tenure_months: int,
    processing_fee_pct: float = 0.0,
    processing_fee_flat: float = 0.0,
    gst_pct_on_fee: float = 18.0,
    gst_pct_on_interest: float = 0.0,
    prepayment_month: Optional[int] = None,
    prepayment_amount: float = 0.0,
    prepayment_action: str = "reduce_tenure",  # "reduce_tenure" or "reduce_emi"
    missed_payment_month: Optional[int] = None,
    missed_penalty_flat: float = 500.0,
    missed_penal_rate_pct: float = 24.0,  # Annual penal interest rate on overdue
    floating_rate_change_month: Optional[int] = None,
    floating_new_rate_pct: Optional[float] = None,
    floating_action: str = "change_emi"  # "change_emi" or "change_tenure"
) -> Dict[str, Any]:
    """
    Generates a month-by-month repayment schedule with:
    - Custom EMI calculations
    - Processing fees and GST
    - Prepayment (part-payment) handling
    - Missed payment with penalty & compounding
    - Floating interest rate transitions
    """
    current_principal = float(principal)
    current_rate = float(annual_rate_pct)
    initial_emi = calculate_standard_emi(current_principal, current_rate, tenure_months)
    active_emi = initial_emi

    # Upfront fees
    proc_fee = (principal * (processing_fee_pct / 100.0)) + processing_fee_flat
    proc_fee_gst = proc_fee * (gst_pct_on_fee / 100.0)
    total_upfront_fees = proc_fee + proc_fee_gst

    schedule: List[Dict[str, Any]] = []
    total_interest_paid = 0.0
    total_gst_on_interest = 0.0
    total_penalties = 0.0
    total_principal_paid = 0.0

    month = 1
    overdue_amount = 0.0
    is_missed = False

    # Maximum safety loop to prevent infinite loops in runaway edge cases
    max_months = tenure_months * 3 + 60

    while current_principal > 0.001 and month <= max_months:
        # Check for floating rate adjustment
        if floating_rate_change_month is not None and month == floating_rate_change_month and floating_new_rate_pct is not None:
            current_rate = float(floating_new_rate_pct)
            remaining_tenure = max(1, tenure_months - month + 1)
            if floating_action == "change_emi":
                active_emi = calculate_standard_emi(current_principal, current_rate, remaining_tenure)
            # If change_tenure, keep active_emi same and tenure will naturally adjust

        monthly_rate = (current_rate / 100.0) / 12.0
        opening_balance = current_principal

        # Standard monthly interest
        regular_interest = opening_balance * monthly_rate
        penal_interest = 0.0
        penalty_fee = 0.0

        # Handle Missed Payment at specified month
        if missed_payment_month is not None and month == missed_payment_month:
            is_missed = True
            penalty_fee = missed_penalty_flat * (1 + (gst_pct_on_fee / 100.0))
            # Interest for this month is added to balance (capitalized or carried forward)
            current_principal += regular_interest + penalty_fee
            total_penalties += penalty_fee
            total_interest_paid += regular_interest

            schedule.append({
                "month": month,
                "opening_balance": round(opening_balance, 2),
                "interest_rate_pct": round(current_rate, 2),
                "emi_billed": 0.0,
                "principal_paid": 0.0,
                "interest_paid": round(regular_interest, 2),
                "gst_on_interest": 0.0,
                "penalty_charges": round(penalty_fee, 2),
                "prepayment": 0.0,
                "total_outflow": 0.0,
                "closing_balance": round(current_principal, 2),
                "status": "MISSED (Penalty Applied)"
            })
            month += 1
            continue

        # If previous payment was missed and we are recovering in next month, penal interest applies
        if is_missed and month == (missed_payment_month + 1):
            penal_monthly_rate = (missed_penal_rate_pct / 100.0) / 12.0
            penal_interest = active_emi * penal_monthly_rate
            total_penalties += penal_interest
            is_missed = False  # Resumed

        interest_this_month = regular_interest + penal_interest
        gst_interest = interest_this_month * (gst_pct_on_interest / 100.0)

        # Standard principal payment
        if active_emi > interest_this_month:
            principal_paid = active_emi - interest_this_month
        else:
            principal_paid = 0.0

        # Adjust for final month payoff
        if principal_paid >= current_principal:
            principal_paid = current_principal
            actual_emi = principal_paid + interest_this_month
        else:
            actual_emi = active_emi

        current_principal -= principal_paid

        # Prepayment handling in this month
        actual_prepayment = 0.0
        if prepayment_month is not None and month == prepayment_month and prepayment_amount > 0:
            actual_prepayment = min(prepayment_amount, current_principal)
            current_principal -= actual_prepayment

            if prepayment_action == "reduce_emi" and current_principal > 0:
                remaining_months = max(1, tenure_months - month)
                active_emi = calculate_standard_emi(current_principal, current_rate, remaining_months)

        month_outflow = actual_emi + gst_interest + actual_prepayment + penalty_fee

        total_principal_paid += principal_paid + actual_prepayment
        total_interest_paid += interest_this_month
        total_gst_on_interest += gst_interest

        schedule.append({
            "month": month,
            "opening_balance": round(opening_balance, 2),
            "interest_rate_pct": round(current_rate, 2),
            "emi_billed": round(actual_emi, 2),
            "principal_paid": round(principal_paid, 2),
            "interest_paid": round(interest_this_month, 2),
            "gst_on_interest": round(gst_interest, 2),
            "penalty_charges": round(penalty_fee + penal_interest, 2),
            "prepayment": round(actual_prepayment, 2),
            "total_outflow": round(month_outflow, 2),
            "closing_balance": round(max(0.0, current_principal), 2),
            "status": "PAID" if actual_prepayment == 0 else f"PAID + Prepayment ₹{actual_prepayment:,.0f}"
        })

        if current_principal <= 0.001:
            break

        month += 1

    actual_tenure_months = len(schedule)
    total_emi_paid = sum(row["emi_billed"] for row in schedule)
    total_cash_outflow = total_emi_paid + sum(row["prepayment"] for row in schedule) + total_gst_on_interest + total_penalties + total_upfront_fees

    return {
        "initial_emi": round(initial_emi, 2),
        "actual_tenure_months": actual_tenure_months,
        "tenure_delta_months": actual_tenure_months - tenure_months,
        "principal": round(principal, 2),
        "total_principal_paid": round(total_principal_paid, 2),
        "total_interest_paid": round(total_interest_paid, 2),
        "total_gst_on_interest": round(total_gst_on_interest, 2),
        "processing_fee": round(proc_fee, 2),
        "processing_fee_gst": round(proc_fee_gst, 2),
        "total_upfront_fees": round(total_upfront_fees, 2),
        "total_penalties": round(total_penalties, 2),
        "true_total_cost": round(total_cash_outflow, 2),
        "schedule": schedule
    }


def compare_three_scenarios(
    product_price: float,
    tenure_months: int,
    # Scenario 1: Bank Loan
    bank_interest_rate_pct: float = 12.0,
    bank_proc_fee_pct: float = 1.5,
    # Scenario 2: No-Cost EMI
    nocost_discount_rate_pct: float = 15.0,  # Bank's implicit interest rate
    nocost_proc_fee_flat: float = 199.0,
    # Scenario 3: Upfront Cash
    upfront_instant_discount_pct: float = 3.0,
    opportunity_return_annual_pct: float = 7.0,  # What if upfront cash was invested?
    # Common modifications
    prepayment_month: Optional[int] = None,
    prepayment_amount: float = 0.0,
    prepayment_action: str = "reduce_tenure",
    missed_payment_month: Optional[int] = None,
    floating_rate_change_month: Optional[int] = None,
    floating_new_rate_pct: Optional[float] = None
) -> Dict[str, Any]:
    """
    Compares:
    1. Scenario A: Standard Bank Loan
    2. Scenario B: 'No-Cost' EMI (with RBI mandated upfront merchant discount + 18% GST on interest)
    3. Scenario C: Upfront Cash Payment (with instant discount + opportunity cost analysis)
    """

    # --- Scenario A: Bank Loan ---
    scenario_a = calculate_amortization_schedule(
        principal=product_price,
        annual_rate_pct=bank_interest_rate_pct,
        tenure_months=tenure_months,
        processing_fee_pct=bank_proc_fee_pct,
        processing_fee_flat=0.0,
        gst_pct_on_fee=18.0,
        gst_pct_on_interest=0.0,  # Standard bank loans don't charge GST on interest
        prepayment_month=prepayment_month,
        prepayment_amount=prepayment_amount,
        prepayment_action=prepayment_action,
        missed_payment_month=missed_payment_month,
        floating_rate_change_month=floating_rate_change_month,
        floating_new_rate_pct=floating_new_rate_pct
    )
    scenario_a["name"] = "Bank Personal Loan"
    scenario_a["tagline"] = f"{bank_interest_rate_pct}% p.a. with {bank_proc_fee_pct}% processing fee"

    # --- Scenario B: No-Cost EMI ---
    # Real-world mechanism:
    # 1. Product price = P
    # 2. Bank interest rate = r (e.g. 15% p.a.)
    # 3. Target EMI = P / tenure
    # 4. Loan Principal financed = Target EMI * [ (1+r)^n - 1 ] / [ r * (1+r)^n ]
    # 5. Upfront Merchant Discount = P - Loan Principal
    monthly_nocost_r = (nocost_discount_rate_pct / 100.0) / 12.0
    factor = (1.0 + monthly_nocost_r) ** tenure_months
    target_nocost_emi = product_price / tenure_months
    financed_principal = target_nocost_emi * (factor - 1.0) / (monthly_nocost_r * factor)
    upfront_merchant_discount = product_price - financed_principal

    scenario_b = calculate_amortization_schedule(
        principal=financed_principal,
        annual_rate_pct=nocost_discount_rate_pct,
        tenure_months=tenure_months,
        processing_fee_pct=0.0,
        processing_fee_flat=nocost_proc_fee_flat,
        gst_pct_on_fee=18.0,
        gst_pct_on_interest=18.0,  # Banks charge 18% GST on monthly interest for No-Cost EMI
        prepayment_month=prepayment_month,
        prepayment_amount=prepayment_amount,
        prepayment_action=prepayment_action,
        missed_payment_month=missed_payment_month,
        floating_rate_change_month=floating_rate_change_month,
        floating_new_rate_pct=floating_new_rate_pct
    )
    scenario_b["name"] = "No-Cost EMI (Merchant Subvention)"
    scenario_b["tagline"] = "Zero advertised interest, but hidden 18% GST on interest + processing fee"
    scenario_b["advertised_sticker_price"] = product_price
    scenario_b["merchant_upfront_discount"] = round(upfront_merchant_discount, 2)
    scenario_b["financed_principal"] = round(financed_principal, 2)

    # --- Scenario C: Upfront Cash ---
    instant_discount = product_price * (upfront_instant_discount_pct / 100.0)
    actual_upfront_cash = product_price - instant_discount

    # Opportunity Cost calculation:
    # If customer paid `actual_upfront_cash` on day 1, they forgo compounding returns
    # at `opportunity_return_annual_pct` in a debt fund or liquid deposit over `tenure_months`.
    # Alternatively, if they had kept the money and paid monthly EMI, they would earn interest.
    # We calculate the forgone interest on the initial capital:
    monthly_opp_r = (opportunity_return_annual_pct / 100.0) / 12.0
    # Compound value after tenure months:
    future_value_if_invested = actual_upfront_cash * ((1.0 + monthly_opp_r) ** tenure_months)
    opportunity_cost_earned = future_value_if_invested - actual_upfront_cash

    # Month-by-month upfront schedule for chart continuity
    upfront_schedule = []
    for m in range(1, tenure_months + 1):
        upfront_schedule.append({
            "month": m,
            "opening_balance": 0.0,
            "interest_rate_pct": 0.0,
            "emi_billed": 0.0,
            "principal_paid": actual_upfront_cash if m == 1 else 0.0,
            "interest_paid": 0.0,
            "gst_on_interest": 0.0,
            "penalty_charges": 0.0,
            "prepayment": 0.0,
            "total_outflow": actual_upfront_cash if m == 1 else 0.0,
            "closing_balance": 0.0,
            "status": "PAID UPFRONT" if m == 1 else "NO DUES"
        })

    scenario_c = {
        "name": "Upfront Cash / Full Payment",
        "tagline": f"{upfront_instant_discount_pct}% upfront discount, zero interest, zero fees",
        "initial_emi": 0.0,
        "actual_tenure_months": 1,
        "tenure_delta_months": 0,
        "principal": round(actual_upfront_cash, 2),
        "instant_discount": round(instant_discount, 2),
        "total_principal_paid": round(actual_upfront_cash, 2),
        "total_interest_paid": 0.0,
        "total_gst_on_interest": 0.0,
        "processing_fee": 0.0,
        "processing_fee_gst": 0.0,
        "total_upfront_fees": 0.0,
        "total_penalties": 0.0,
        "opportunity_cost_forgone": round(opportunity_cost_earned, 2),
        "true_total_cost": round(actual_upfront_cash, 2),
        "true_total_cost_with_opp_cost": round(actual_upfront_cash + opportunity_cost_earned, 2),
        "schedule": upfront_schedule
    }

    # Recommendation Engine
    recommendation = generate_recommendation(scenario_a, scenario_b, scenario_c, opportunity_return_annual_pct)

    return {
        "product_price": product_price,
        "tenure_months": tenure_months,
        "scenarios": {
            "bank_loan": scenario_a,
            "nocost_emi": scenario_b,
            "upfront_cash": scenario_c
        },
        "recommendation": recommendation
    }


def generate_recommendation(scen_a: Dict[str, Any], scen_b: Dict[str, Any], scen_c: Dict[str, Any], opp_rate: float) -> Dict[str, Any]:
    """
    Ranks the 3 options and provides a transparent, data-backed financial recommendation.
    """
    cost_a = scen_a["true_total_cost"]
    cost_b = scen_b["true_total_cost"]
    cost_c = scen_c["true_total_cost"]
    cost_c_opp = scen_c.get("true_total_cost_with_opp_cost", cost_c)

    options = [
        {"id": "upfront_cash", "name": scen_c["name"], "cost": cost_c, "opp_cost": cost_c_opp},
        {"id": "nocost_emi", "name": scen_b["name"], "cost": cost_b, "opp_cost": cost_b},
        {"id": "bank_loan", "name": scen_a["name"], "cost": cost_a, "opp_cost": cost_a}
    ]

    # Sort strictly by out-of-pocket cash outflow
    sorted_by_cost = sorted(options, key=lambda x: x["cost"])
    winner = sorted_by_cost[0]
    worst = sorted_by_cost[-1]
    savings_vs_worst = round(worst["cost"] - winner["cost"], 2)

    # Analyze hidden traps
    nocost_hidden_fee = scen_b["total_gst_on_interest"] + scen_b["total_upfront_fees"]
    bank_hidden_fee = scen_a["total_interest_paid"] + scen_a["total_upfront_fees"]

    reasons = []
    if winner["id"] == "upfront_cash":
        reasons.append(
            f"Upfront cash payment saves you ₹{savings_vs_worst:,.0f} compared to the most expensive option ({worst['name']})."
        )
        reasons.append(
            f"You completely bypass ₹{bank_hidden_fee:,.0f} in bank interest/processing fees."
        )
        if cost_b > cost_c:
            reasons.append(
                f"Beware of 'No-Cost EMI': It actually charges ₹{nocost_hidden_fee:,.0f} extra in mandatory 18% GST on interest and card fees."
            )
        if cost_c_opp < cost_b:
            reasons.append(
                f"Even when accounting for a {opp_rate}% investment opportunity cost (₹{scen_c['opportunity_cost_forgone']:,.0f}), Upfront Cash remains financially superior."
            )
    elif winner["id"] == "nocost_emi":
        reasons.append(
            f"No-Cost EMI is the most cost-effective option here with total outflow of ₹{cost_b:,.0f}."
        )
        reasons.append(
            f"However, note the hidden ₹{nocost_hidden_fee:,.0f} charged via 18% GST on monthly interest and flat fees."
        )
    else:
        reasons.append(
            f"Bank Loan is favored due to specific fee structures or high opportunity yields."
        )

    verdict_badge = "BEST FINANCIAL VALUE"
    return {
        "recommended_id": winner["id"],
        "recommended_name": winner["name"],
        "winner_total_cost": winner["cost"],
        "savings_vs_worst": savings_vs_worst,
        "worst_name": worst["name"],
        "reasons": reasons,
        "verdict_badge": verdict_badge,
        "summary": " ".join(reasons[:2])
    }
