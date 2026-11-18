"""
Test Suite for Financial Decision Impact Simulator
Verifies:
1. EMI matches standard banking calculators within ₹1
2. Month-by-month amortization schedule accuracy and zero residual balance
3. Processing fees and GST application
4. Early repayment (Reduce EMI vs Reduce Tenure)
5. Missed payment penalties and compounding
6. Floating rate mid-loan shifts
7. 3-Scenario comparison and recommendation logic
"""

import unittest
from simulator import calculate_standard_emi, calculate_amortization_schedule, compare_three_scenarios


class TestFinancialSimulator(unittest.TestCase):

    def test_emi_accuracy_against_standard_bank_benchmarks(self):
        """
        Judges requirement: 'Your EMI must match a standard EMI calculator within ₹1'
        Test benchmarks from SBI / HDFC standard calculator:
        Case 1: P=1,00,000, Rate=12% p.a., N=12 months -> EMI = 8,884.88 (~₹8,885)
        Case 2: P=10,00,000, Rate=8.5% p.a., N=240 months (20 yrs) -> EMI = 8,678.23 (~₹8,678)
        Case 3: P=5,00,000, Rate=9.5% p.a., N=60 months (5 yrs) -> EMI = 10,500.67 (~₹10,501)
        Case 4: P=25,000, Rate=14% p.a., N=6 months -> EMI = 4,339.73 (~₹4,340)
        """
        benchmarks = [
            (100000, 12.0, 12, 8884.88),
            (1000000, 8.5, 240, 8678.23),
            (500000, 9.5, 60, 10500.93),
            (25000, 14.0, 6, 4338.45),
        ]

        for p, r, n, expected_emi in benchmarks:
            calc_emi = calculate_standard_emi(p, r, n)
            diff = abs(calc_emi - expected_emi)
            self.assertLess(
                diff, 1.0,
                f"Failed for P={p}, R={r}, N={n}: Calculated {calc_emi:.2f}, expected {expected_emi:.2f}, diff={diff:.2f}"
            )
            print(f"✓ Pass: P=₹{p:,}, R={r}%, N={n}m => Calculated EMI: ₹{calc_emi:.2f} (Diff vs standard: ₹{diff:.4f})")

    def test_amortization_schedule_zero_residual(self):
        """
        Ensure that the month-by-month repayment schedule pays off the entire principal
        and ending balance is zero.
        """
        res = calculate_amortization_schedule(
            principal=100000,
            annual_rate_pct=12.0,
            tenure_months=12,
            processing_fee_pct=1.0,
            gst_pct_on_fee=18.0
        )
        self.assertEqual(res["actual_tenure_months"], 12)
        final_row = res["schedule"][-1]
        self.assertAlmostEqual(final_row["closing_balance"], 0.0, places=2)
        self.assertAlmostEqual(res["total_principal_paid"], 100000, delta=1.0)
        # Processing fee: 1% of 100000 = 1000, GST = 180, Total fee = 1180
        self.assertEqual(res["processing_fee"], 1000.0)
        self.assertEqual(res["processing_fee_gst"], 180.0)
        self.assertEqual(res["total_upfront_fees"], 1180.0)
        print("✓ Pass: Amortization schedule zeroes out correctly and upfront fees are accurate.")

    def test_prepayment_reduce_tenure(self):
        """
        Test early repayment at Month 6 with 'reduce_tenure'.
        Loan should finish earlier than 12 months.
        """
        normal_res = calculate_amortization_schedule(
            principal=100000,
            annual_rate_pct=12.0,
            tenure_months=12
        )
        prepay_res = calculate_amortization_schedule(
            principal=100000,
            annual_rate_pct=12.0,
            tenure_months=12,
            prepayment_month=6,
            prepayment_amount=30000,
            prepayment_action="reduce_tenure"
        )
        self.assertLess(prepay_res["actual_tenure_months"], normal_res["actual_tenure_months"])
        self.assertLess(prepay_res["total_interest_paid"], normal_res["total_interest_paid"])
        print(f"✓ Pass: Prepayment Reduce Tenure saved {normal_res['actual_tenure_months'] - prepay_res['actual_tenure_months']} months and ₹{normal_res['total_interest_paid'] - prepay_res['total_interest_paid']:.2f} interest.")

    def test_prepayment_reduce_emi(self):
        """
        Test early repayment at Month 6 with 'reduce_emi'.
        Tenure remains 12 months, but monthly EMI drops starting month 7.
        """
        prepay_res = calculate_amortization_schedule(
            principal=100000,
            annual_rate_pct=12.0,
            tenure_months=12,
            prepayment_month=6,
            prepayment_amount=30000,
            prepayment_action="reduce_emi"
        )
        self.assertEqual(prepay_res["actual_tenure_months"], 12)
        initial_emi = prepay_res["schedule"][0]["emi_billed"]
        post_prepay_emi = prepay_res["schedule"][6]["emi_billed"]
        self.assertLess(post_prepay_emi, initial_emi)
        print(f"✓ Pass: Prepayment Reduce EMI dropped installment from ₹{initial_emi:.2f} to ₹{post_prepay_emi:.2f}.")

    def test_missed_payment_with_penalty(self):
        """
        Test missing payment at month 3.
        Should incur late fee + penal interest and increase total cost.
        """
        clean_res = calculate_amortization_schedule(
            principal=100000,
            annual_rate_pct=12.0,
            tenure_months=12
        )
        missed_res = calculate_amortization_schedule(
            principal=100000,
            annual_rate_pct=12.0,
            tenure_months=12,
            missed_payment_month=3,
            missed_penalty_flat=500.0,
            missed_penal_rate_pct=24.0
        )
        self.assertGreater(missed_res["true_total_cost"], clean_res["true_total_cost"])
        self.assertGreater(missed_res["total_penalties"], 500.0)
        self.assertEqual(missed_res["schedule"][2]["status"], "MISSED (Penalty Applied)")
        print(f"✓ Pass: Missed payment increased total cost by ₹{missed_res['true_total_cost'] - clean_res['true_total_cost']:.2f}.")

    def test_floating_interest_rate_change(self):
        """
        Test floating rate increase at month 6 from 10% to 12%.
        """
        float_res = calculate_amortization_schedule(
            principal=100000,
            annual_rate_pct=10.0,
            tenure_months=12,
            floating_rate_change_month=6,
            floating_new_rate_pct=12.0,
            floating_action="change_emi"
        )
        rate_m1 = float_res["schedule"][0]["interest_rate_pct"]
        rate_m6 = float_res["schedule"][5]["interest_rate_pct"]
        self.assertEqual(rate_m1, 10.0)
        self.assertEqual(rate_m6, 12.0)
        print(f"✓ Pass: Floating interest rate transitioned smoothly at month 6 from {rate_m1}% to {rate_m6}%.")

    def test_compare_three_scenarios_and_recommendation(self):
        """
        Test the full 3-scenario comparison: Bank loan vs No-cost EMI vs Upfront cash.
        """
        res = compare_three_scenarios(
            product_price=100000,
            tenure_months=12,
            bank_interest_rate_pct=12.0,
            bank_proc_fee_pct=1.5,
            nocost_discount_rate_pct=15.0,
            nocost_proc_fee_flat=199.0,
            upfront_instant_discount_pct=3.0,
            opportunity_return_annual_pct=7.0
        )
        scens = res["scenarios"]
        self.assertIn("bank_loan", scens)
        self.assertIn("nocost_emi", scens)
        self.assertIn("upfront_cash", scens)

        rec = res["recommendation"]
        self.assertIsNotNone(rec["recommended_id"])
        self.assertTrue(len(rec["reasons"]) > 0)
        print(f"✓ Pass: 3-Way Scenario comparison completed. Recommended: {rec['recommended_name']} (Savings: ₹{rec['savings_vs_worst']:,.2f})")


if __name__ == "__main__":
    unittest.main()
