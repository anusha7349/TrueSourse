"""
Flask Web Application & REST API
PS11 - Financial Decision Impact Simulator
Serves the interactive dashboard and REST endpoints for programmatic verification.
"""

from flask import Flask, jsonify, request, send_from_directory
import os
from simulator import (
    calculate_standard_emi,
    calculate_amortization_schedule,
    compare_three_scenarios
)

app = Flask(__name__, static_folder=".", static_url_path="")


@app.route("/")
def serve_index():
    return send_from_directory(".", "index.html")


@app.route("/<path:path>")
def serve_static(path):
    return send_from_directory(".", path)


@app.route("/api/emi", methods=["GET", "POST"])
def api_emi():
    """Calculates standard reducing balance EMI."""
    data = request.get_json(silent=True) or request.args
    try:
        principal = float(data.get("principal", 100000))
        rate = float(data.get("rate", 12.0))
        tenure = int(data.get("tenure", 12))
        emi = calculate_standard_emi(principal, rate, tenure)
        return jsonify({
            "status": "success",
            "principal": principal,
            "annual_rate_pct": rate,
            "tenure_months": tenure,
            "calculated_emi": round(emi, 2),
            "rounded_emi": round(emi)
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400


@app.route("/api/compare", methods=["POST", "GET"])
def api_compare():
    """Runs 3-way scenario comparison with custom inputs."""
    data = request.get_json(silent=True) or request.args
    try:
        product_price = float(data.get("product_price", 100000))
        tenure_months = int(data.get("tenure_months", 12))
        bank_rate = float(data.get("bank_interest_rate_pct", 12.0))
        bank_proc = float(data.get("bank_proc_fee_pct", 1.5))
        nocost_rate = float(data.get("nocost_discount_rate_pct", 15.0))
        nocost_fee = float(data.get("nocost_proc_fee_flat", 199.0))
        upfront_disc = float(data.get("upfront_instant_discount_pct", 3.0))
        opp_rate = float(data.get("opportunity_return_annual_pct", 7.0))

        prepayment_month = int(data["prepayment_month"]) if data.get("prepayment_month") else None
        prepayment_amount = float(data.get("prepayment_amount", 0.0))
        prepayment_action = str(data.get("prepayment_action", "reduce_tenure"))

        missed_month = int(data["missed_payment_month"]) if data.get("missed_payment_month") else None
        floating_month = int(data["floating_rate_change_month"]) if data.get("floating_rate_change_month") else None
        floating_rate = float(data["floating_new_rate_pct"]) if data.get("floating_new_rate_pct") else None

        result = compare_three_scenarios(
            product_price=product_price,
            tenure_months=tenure_months,
            bank_interest_rate_pct=bank_rate,
            bank_proc_fee_pct=bank_proc,
            nocost_discount_rate_pct=nocost_rate,
            nocost_proc_fee_flat=nocost_fee,
            upfront_instant_discount_pct=upfront_disc,
            opportunity_return_annual_pct=opp_rate,
            prepayment_month=prepayment_month,
            prepayment_amount=prepayment_amount,
            prepayment_action=prepayment_action,
            missed_payment_month=missed_month,
            floating_rate_change_month=floating_month,
            floating_new_rate_pct=floating_rate
        )
        return jsonify({"status": "success", "data": result})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400


@app.route("/api/verify-benchmarks", methods=["GET"])
def api_verify_benchmarks():
    """Pre-calculated judge verification suite."""
    benchmarks = [
        {"p": 100000, "r": 12.0, "n": 12, "expected": 8884.88},
        {"p": 1000000, "r": 8.5, "n": 240, "expected": 8678.23},
        {"p": 500000, "r": 9.5, "n": 60, "expected": 10500.93},
        {"p": 25000, "r": 14.0, "n": 6, "expected": 4338.45}
    ]
    results = []
    all_passed = True
    for b in benchmarks:
        calc = calculate_standard_emi(b["p"], b["r"], b["n"])
        diff = abs(calc - b["expected"])
        passed = diff < 1.0
        if not passed:
            all_passed = False
        results.append({
            "principal": b["p"],
            "annual_rate": b["r"],
            "tenure_months": b["n"],
            "expected_emi": b["expected"],
            "calculated_emi": round(calc, 2),
            "difference": round(diff, 4),
            "passed": passed
        })

    return jsonify({
        "status": "success",
        "all_benchmarks_passed": all_passed,
        "results": results
    })


if __name__ == "__main__":
    print("=" * 60)
    print("TRUECOST AI - Financial Decision Impact Simulator")
    print("Running server at http://localhost:5000")
    print("=" * 60)
    app.run(host="0.0.0.0", port=5000, debug=False)
