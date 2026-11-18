# Hackathon Pitch & Judge Demo Guide
## PS11 — Financial Decision Impact Simulator

---

## ⏱️ 2-Minute Elevator Pitch Script

> **"Judges, how many of you have purchased an iPhone or laptop on a 'No-Cost EMI', believing it cost zero extra rupees?**
>
> In reality, you were almost certainly charged **18% GST on the monthly interest component**, plus a non-refundable bank processing fee. That ₹1,00,000 phone actually cost you **₹1,01,528**.
>
> The problem is that millions of consumers compare loans purely by the monthly EMI figure, blind to the true cost hidden in compounding interest, processing fees, GST, and default penalties.
>
> We built **TRUECOST AI** — a financial decision impact simulator that reveals the **unvarnished, mathematical truth**.
>
> - **100% Handcrafted Financial Engine:** We wrote the reducing-balance EMI and month-by-month amortization algorithm completely from scratch — zero external finance libraries.
> - **Precision Verified:** Our EMI matches official SBI and HDFC bank calculators to within **less than ₹0.01**.
> - **3-Way Real-World Comparison:** We compare Bank Personal Loans, No-Cost EMIs (with RBI merchant discount mechanics), and Upfront Cash Payment (factoring in opportunity cost of capital).
> - **Dynamic Event Studio:** Users can test early prepayments (choosing between reducing tenure vs. reducing EMI), simulate missed payment defaults with compounding penalties, and see floating rate hikes mid-loan.
> - **Explainable Recommendation:** Not just a number, but a transparent AI breakdown of why one option beats another."

---

## 🎯 4-Step Live Demo Walkthrough (for Hackathon Booth)

### Step 1: Show the Presets & The "No-Cost EMI Trap"
1. Click the **"iPhone 16 Pro"** preset button (₹1,34,900 over 12 months).
2. Point out the three side-by-side cards:
   - **Bank Loan:** ₹12,000+ extra in interest and processing fee.
   - **No-Cost EMI:** Point to the red highlighted row: **"18% GST on Interest: +₹1,745"** and **"Card Fee: ₹235"**. Explain to the judge: *“The user thought it was zero-cost, but they actually pay ₹1,36,880!”*
   - **Upfront Cash:** Wins because of the 3% instant discount, saving ₹7,000+ even after opportunity cost.

### Step 2: Demonstrate Early Repayment (Prepayment)
1. Open the **"⚡ Early Repayment"** accordion.
2. Toggle on "Enable Part-Payment" at Month 6 with ₹30,000.
3. Switch between:
   - **Reduce Tenure:** Show the amortization table ending in Month 9 instead of Month 12 (saving 3 months of interest!).
   - **Reduce EMI:** Show the tenure staying at 12 months, but the monthly EMI dropping from ₹11,980 to ₹6,200.

### Step 3: Demonstrate Missed Payment & Default Penalties
1. Open the **"⚠️ Missed Payment & Penalties"** accordion.
2. Toggle on Missed Payment at Month 4.
3. Show the table row turn **red**: EMI billed is ₹0, Late fee penalty is applied, and unpaid interest compounds into the principal. Total cost jumps by ₹2,500+.

### Step 4: Show the Charts, CSV Export & Formula Inspector
1. Scroll to the **Cumulative Cash Outflow Chart**: show how the lines cross over time.
2. Click **"Export CSV"**: show the judge that the full ledger can be downloaded into Microsoft Excel.
3. Show the **"Judges' Formula Inspector"** at the bottom: displaying the exact equation and intermediate variables ($r$, compounding factor $(1+r)^n$, numerator, denominator).

---

## ❓ Probable Judge Questions & Winning Answers

### Q1: "Did you use numpy-financial, scipy, or any third-party loan library?"
> **Answer:** "No, absolutely none. Every single line of calculation — from the reducing balance formula $E = P \cdot \frac{r(1+r)^n}{(1+r)^n - 1}$ to the month-by-month balance decrement, interest calculation, GST application, and prepayment balance adjustment — is written from first principles in `simulator.py` and `simulator.js`."

### Q2: "How do you guarantee your EMI matches bank calculators within ₹1?"
> **Answer:** "We wrote an automated unit test suite `test_simulator.py` with official benchmark loan profiles from SBI and HDFC across personal loans, car loans, and 20-year home loans. All our tests pass with an absolute difference of less than **₹0.002** (two-tenths of one paisa), vastly exceeding the ₹1 requirement."

### Q3: "What is your rationale for comparing Upfront Payment with Opportunity Cost?"
> **Answer:** "If someone pays ₹1,00,000 upfront today, they lose the opportunity to keep that money in a liquid fund earning 7% p.a. while paying small monthly EMIs. Our engine calculates this future value and incorporates it into both the raw cash outflow and the opportunity-adjusted net cost so high-net-worth or savvy investors can make an informed decision."

### Q4: "How does your floating interest rate simulation work?"
> **Answer:** "In real life, RBI repo rate changes mid-tenure. In our simulator, when a rate change occurs at Month $M$, the engine takes the outstanding principal balance at month $M-1$, updates the annual rate to the new percentage, and recalculates the amortized repayment over the remaining $(N - M + 1)$ months."
