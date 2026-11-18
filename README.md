# TRUECOST AI — Financial Decision Impact Simulator
**Hackathon Problem Statement 11 (PS11)**

> **The Problem:** People compare loans by monthly EMI alone and miss the real cost hidden in interest, processing fees, GST, and default penalties.  
> **The Solution:** An uncompromised, zero-dependency financial simulation engine that reveals the **TRUE total cost** of borrowing vs. merchant "No-Cost" EMIs vs. paying upfront.

---

## 🌟 Key Highlights & Hackathon Scoring Matrix

| Evaluation Criteria | Implementation Status | Technical Details |
| :--- | :---: | :--- |
| **Compare 3 Scenarios** | ✅ Complete | Bank Loan vs. "No-Cost" EMI vs. Upfront Cash with Opportunity Cost |
| **Custom Formula Engine** | ✅ Complete | 100% custom math — **No finance libraries** (zero `numpy-financial`) |
| **EMI Benchmark Precision** | ✅ **< ₹0.01 Diff** | Matches standard SBI/HDFC calculators within ₹0.002 |
| **Fees & 18% GST** | ✅ Complete | Processing fee GST (18%) + hidden 18% GST on monthly interest in No-Cost EMI |
| **Early Repayment (Prepayment)** | ✅ Complete | Toggle **"Reduce Tenure"** (save interest) vs. **"Reduce EMI"** (lower bill) |
| **Missed Payment & Penalties** | ✅ Complete | Late fee + 18% GST + compound penal interest on overdue balance |
| **Smart Recommendation** | ✅ Complete | Data-backed winner selection with transparent financial rationale |
| **Floating Rate Mid-Loan (Adv.)** | ✅ Complete | Mid-tenure rate adjustment with dynamic schedule recalculation |
| **Multi-Scenario Visual Charts** | ✅ Complete | Chart.js cumulative outflow trajectory & cost composition stacked bars |
| **CSV Amortization Export** | ✅ Complete | One-click export for judges to verify every formula cell in Excel |

---

## 🚀 Quick Start Guide

You have **two easy ways** to run and demo this project:

### Option A: Standalone Browser Mode (Zero Installation, 100% Offline)
1. Simply double-click **`index.html`** or open it in Google Chrome / Microsoft Edge / Brave.
2. The offline `chart.min.js` and `simulator.js` will immediately load.
3. Perfect for hackathon demos if WiFi is slow or ports are restricted!

### Option B: Full-Stack Python Flask Mode (With REST APIs)
1. Run the test suite to verify math against standard bank benchmarks:
   ```bash
   python test_simulator.py
   ```
2. Start the web server:
   ```bash
   python app.py
   ```
3. Open your browser and navigate to:
   ```
   http://localhost:5000
   ```

---

## 🧮 Mathematical Formulations (Custom Handcrafted)

### 1. Standard Reducing-Balance EMI Formula
$$E = P \cdot \frac{r(1 + r)^n}{(1 + r)^n - 1}$$
Where:
- $P$ = Principal amount
- $r$ = Monthly interest rate $= \frac{\text{Annual Rate}}{12 \times 100}$
- $n$ = Loan tenure in months

### 2. Month-by-Month Amortization Ledger
For each month $m \in [1, n]$:
- $\text{Interest}_m = \text{Balance}_{m-1} \times r$
- $\text{Principal}_m = E - \text{Interest}_m$
- $\text{GST on Interest}_m = \text{Interest}_m \times 18\%$ (mandatory in card/merchant EMIs)
- $\text{Balance}_m = \text{Balance}_{m-1} - \text{Principal}_m - \text{Prepayment}_m$

### 3. The "No-Cost EMI" Mathematical Reality
Under RBI regulations, banks cannot lend at 0%. Merchants provide an upfront subvention discount:
$$\text{Financed Principal} = \frac{P_{\text{retail}}}{n} \times \frac{(1+r)^n - 1}{r(1+r)^n}$$
$$\text{Upfront Discount} = P_{\text{retail}} - \text{Financed Principal}$$
**The Hidden Trap Exposed:** The customer still pays the full bank interest rate on the financed amount, and the bank levies **18% GST on every month's interest charge** plus a non-refundable processing fee!

### 4. Early Repayment (Prepayment)
- **Reduce Tenure:** Keeps EMI constant ($E$), reducing remaining months to pay off the principal faster.
- **Reduce EMI:** Keeps remaining tenure $(n - m)$ constant and recalculates a lower monthly installment:
  $$E_{\text{new}} = \text{Balance}_{\text{new}} \times \frac{r(1+r)^{n-m}}{(1+r)^{n-m} - 1}$$

### 5. Missed Payment & Default Compounding
When a payment is missed in month $k$:
- Payment billed = ₹0
- Penalty Fee $= \text{Late Fee} \times (1 + \text{GST})$
- Accrued Interest $= \text{Balance}_{k-1} \times r$
- Capitalized Balance $= \text{Balance}_{k-1} + \text{Accrued Interest} + \text{Penalty Fee}$
- In month $k+1$, penal overdue interest (e.g. 24% p.a.) is applied.

---

## 📁 Project Architecture

```
├── simulator.py        # Core financial calculation engine in pure Python (no finance libs)
├── simulator.js        # Identical pure JS engine for client-side execution & offline reactivity
├── test_simulator.py   # Unit test suite verifying benchmarks & loan events
├── app.py              # Flask server and REST API endpoints (/api/compare, /api/verify-benchmarks)
├── index.html          # Modern, responsive fintech user interface
├── styles.css          # Sleek fintech styling (glassmorphism, modern typography)
├── app.js              # UI controller, Chart.js graphs, event bindings & CSV export
├── chart.min.js        # Local Chart.js bundle for 100% offline hackathon demos
└── HACKATHON_PITCH.md  # 2-minute elevator pitch script and judge Q&A guide
```

---

## 🧪 Benchmark Verification Table

Run `python test_simulator.py` to see:
| Loan Type | Principal | Rate | Tenure | Standard Calculator | Our Engine | Difference | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Personal Loan | ₹1,00,000 | 12.0% | 12m | ₹8,884.88 | ₹8,884.88 | **₹0.001** | ✅ PASSED |
| Home Loan | ₹10,00,000 | 8.5% | 240m | ₹8,678.23 | ₹8,678.23 | **₹0.002** | ✅ PASSED |
| Auto Loan | ₹5,00,000 | 9.5% | 60m | ₹10,500.93 | ₹10,500.93 | **₹0.000** | ✅ PASSED |
| Consumer Durables | ₹25,000 | 14.0% | 6m | ₹4,338.45 | ₹4,338.45 | **₹0.000** | ✅ PASSED |
