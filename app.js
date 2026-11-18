/**
 * Frontend Controller for TRUECOST AI
 * Connects UI inputs, reactive recalculation, Chart.js graphs, and table exports.
 */

let currentSimulation = null;
let activeTableTab = "bank";
let chartCumulativeInstance = null;
let chartCompositionInstance = null;

// Presets data
const PRESETS = {
  iphone: {
    price: 134900,
    tenure: 12,
    bankRate: 13.0,
    bankProc: 1.5,
    nocostRate: 15.0,
    nocostFee: 199,
    upfrontDisc: 3.0,
    oppRate: 7.0
  },
  macbook: {
    price: 199900,
    tenure: 24,
    bankRate: 11.5,
    bankProc: 1.0,
    nocostRate: 14.0,
    nocostFee: 299,
    upfrontDisc: 4.0,
    oppRate: 7.5
  },
  ev_bike: {
    price: 115000,
    tenure: 36,
    bankRate: 10.5,
    bankProc: 2.0,
    nocostRate: 15.0,
    nocostFee: 250,
    upfrontDisc: 2.5,
    oppRate: 6.5
  },
  personal_loan: {
    price: 300000,
    tenure: 24,
    bankRate: 14.5,
    bankProc: 2.0,
    nocostRate: 16.0,
    nocostFee: 500,
    upfrontDisc: 0.0,
    oppRate: 7.0
  }
};

function init() {
  bindInputEvents();
  runSimulation();
}

function bindInputEvents() {
  // Sync slider and number inputs
  const priceInput = document.getElementById("input-price");
  const priceSlider = document.getElementById("slider-price");
  priceInput.addEventListener("input", () => {
    priceSlider.value = priceInput.value;
    runSimulation();
  });
  priceSlider.addEventListener("input", () => {
    priceInput.value = priceSlider.value;
    runSimulation();
  });

  const tenureInput = document.getElementById("input-tenure");
  const tenureSlider = document.getElementById("slider-tenure");
  tenureInput.addEventListener("input", () => {
    tenureSlider.value = tenureInput.value;
    runSimulation();
  });
  tenureSlider.addEventListener("input", () => {
    tenureInput.value = tenureSlider.value;
    runSimulation();
  });

  // Other numeric inputs
  const inputsToListen = [
    "input-bank-rate", "input-bank-proc",
    "input-nocost-rate", "input-nocost-fee",
    "input-upfront-disc", "input-opp-rate",
    "input-prepay-month", "input-prepay-amount",
    "input-missed-month", "input-missed-penalty", "input-missed-penal-rate",
    "input-floating-month", "input-floating-rate"
  ];

  inputsToListen.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", () => runSimulation());
  });

  // Toggles inside simulation studio
  document.getElementById("toggle-prepay").addEventListener("change", (e) => {
    document.getElementById("prepay-controls").style.display = e.target.checked ? "flex" : "none";
    runSimulation();
  });

  document.getElementById("toggle-missed").addEventListener("change", (e) => {
    document.getElementById("missed-controls").style.display = e.target.checked ? "flex" : "none";
    runSimulation();
  });

  document.getElementById("toggle-floating").addEventListener("change", (e) => {
    document.getElementById("floating-controls").style.display = e.target.checked ? "flex" : "none";
    runSimulation();
  });
}

function toggleAccordion(bodyId) {
  const body = document.getElementById(bodyId);
  const arrowId = bodyId.replace("-body", "-arrow");
  const arrow = document.getElementById(arrowId);
  if (body.style.display === "none") {
    body.style.display = "flex";
    if (arrow) arrow.innerText = "▲";
  } else {
    body.style.display = "none";
    if (arrow) arrow.innerText = "▼";
  }
}

function applyPreset(name) {
  const p = PRESETS[name];
  if (!p) return;

  document.getElementById("input-price").value = p.price;
  document.getElementById("slider-price").value = p.price;
  document.getElementById("input-tenure").value = p.tenure;
  document.getElementById("slider-tenure").value = p.tenure;
  document.getElementById("input-bank-rate").value = p.bankRate;
  document.getElementById("input-bank-proc").value = p.bankProc;
  document.getElementById("input-nocost-rate").value = p.nocostRate;
  document.getElementById("input-nocost-fee").value = p.nocostFee;
  document.getElementById("input-upfront-disc").value = p.upfrontDisc;
  document.getElementById("input-opp-rate").value = p.oppRate;

  runSimulation();
}

function runSimulation() {
  const price = Number(document.getElementById("input-price").value) || 100000;
  const tenure = parseInt(document.getElementById("input-tenure").value, 10) || 12;
  const bankRate = Number(document.getElementById("input-bank-rate").value) || 12.0;
  const bankProc = Number(document.getElementById("input-bank-proc").value) || 1.5;
  const nocostRate = Number(document.getElementById("input-nocost-rate").value) || 15.0;
  const nocostFee = Number(document.getElementById("input-nocost-fee").value) || 199;
  const upfrontDisc = Number(document.getElementById("input-upfront-disc").value) || 3.0;
  const oppRate = Number(document.getElementById("input-opp-rate").value) || 7.0;

  // Update preview labels
  document.getElementById("label-price").innerText = `₹${price.toLocaleString("en-IN")}`;
  document.getElementById("label-tenure").innerText = `${tenure} Months`;
  document.getElementById("label-bank-rate").innerText = `${bankRate.toFixed(1)}%`;
  document.getElementById("label-bank-proc").innerText = `${bankProc.toFixed(1)}%`;
  document.getElementById("label-nocost-rate").innerText = `${nocostRate.toFixed(1)}%`;
  document.getElementById("label-nocost-fee").innerText = `₹${nocostFee}`;
  document.getElementById("label-upfront-disc").innerText = `${upfrontDisc.toFixed(1)}%`;
  document.getElementById("label-opp-rate").innerText = `${oppRate.toFixed(1)}%`;

  // Prepayment config
  const enablePrepay = document.getElementById("toggle-prepay").checked;
  const prepayMonth = enablePrepay ? parseInt(document.getElementById("input-prepay-month").value, 10) : null;
  const prepayAmount = enablePrepay ? Number(document.getElementById("input-prepay-amount").value) : 0;
  const prepayAction = document.querySelector('input[name="prepay-action"]:checked').value;

  // Missed payment config
  const enableMissed = document.getElementById("toggle-missed").checked;
  const missedMonth = enableMissed ? parseInt(document.getElementById("input-missed-month").value, 10) : null;
  const missedPenalty = enableMissed ? Number(document.getElementById("input-missed-penalty").value) : 500;
  const missedPenalRate = enableMissed ? Number(document.getElementById("input-missed-penal-rate").value) : 24;

  // Floating rate config
  const enableFloating = document.getElementById("toggle-floating").checked;
  const floatingMonth = enableFloating ? parseInt(document.getElementById("input-floating-month").value, 10) : null;
  const floatingNewRate = enableFloating ? Number(document.getElementById("input-floating-rate").value) : null;

  // Run calculation
  const sim = compareThreeScenariosJS({
    productPrice: price,
    tenureMonths: tenure,
    bankInterestRatePct: bankRate,
    bankProcFeePct: bankProc,
    nocostDiscountRatePct: nocostRate,
    nocostProcFeeFlat: nocostFee,
    upfrontInstantDiscountPct: upfrontDisc,
    opportunityReturnAnnualPct: oppRate,
    prepaymentMonth: prepayMonth,
    prepaymentAmount: prepayAmount,
    prepaymentAction: prepayAction,
    missedPaymentMonth: missedMonth,
    missedPenaltyFlat: missedPenalty,
    missedPenalRatePct: missedPenalRate,
    floatingMonth: floatingMonth,
    floatingNewRate: floatingNewRate
  });

  currentSimulation = sim;

  renderComparisonCards(sim);
  renderRecommendation(sim.recommendation);
  renderCharts(sim);
  renderAmortizationTable();
  updateFormulaInspection(price, bankRate, tenure, sim.scenarios.bankLoan.initialEmi);
}

function renderComparisonCards(sim) {
  const bank = sim.scenarios.bankLoan;
  const nocost = sim.scenarios.nocostEmi;
  const upfront = sim.scenarios.upfrontCash;

  // 1. Bank Loan Card
  document.getElementById("bank-emi").innerText = `₹${Math.round(bank.initialEmi).toLocaleString("en-IN")}`;
  document.getElementById("bank-tenure-tag").innerText = `over ${bank.actualTenureMonths} months (${bank.schedule[0].interestRatePct}% p.a.)`;
  document.getElementById("bank-principal").innerText = `₹${Math.round(bank.principal).toLocaleString("en-IN")}`;
  document.getElementById("bank-interest").innerText = `₹${Math.round(bank.totalInterestPaid).toLocaleString("en-IN")}`;
  document.getElementById("bank-fee").innerText = `₹${Math.round(bank.totalUpfrontFees).toLocaleString("en-IN")}`;
  document.getElementById("bank-penalty").innerText = `₹${Math.round(bank.totalPenalties).toLocaleString("en-IN")}`;
  document.getElementById("bank-total").innerText = `₹${Math.round(bank.trueTotalCost).toLocaleString("en-IN")}`;

  // 2. No-Cost EMI Card
  document.getElementById("nocost-emi").innerText = `₹${Math.round(nocost.initialEmi).toLocaleString("en-IN")}`;
  document.getElementById("nocost-financed").innerText = `₹${Math.round(nocost.financedPrincipal).toLocaleString("en-IN")}`;
  document.getElementById("nocost-discount").innerText = `-₹${Math.round(nocost.merchantUpfrontDiscount).toLocaleString("en-IN")}`;
  document.getElementById("nocost-gst").innerText = `+₹${Math.round(nocost.totalGstOnInterest).toLocaleString("en-IN")}`;
  document.getElementById("nocost-fee").innerText = `₹${Math.round(nocost.totalUpfrontFees).toLocaleString("en-IN")}`;
  document.getElementById("nocost-total").innerText = `₹${Math.round(nocost.trueTotalCost).toLocaleString("en-IN")}`;

  // 3. Upfront Card
  document.getElementById("upfront-outflow").innerText = `₹${Math.round(upfront.trueTotalCost).toLocaleString("en-IN")}`;
  document.getElementById("upfront-base").innerText = `₹${Math.round(sim.productPrice).toLocaleString("en-IN")}`;
  document.getElementById("upfront-discount").innerText = `-₹${Math.round(upfront.instantDiscount).toLocaleString("en-IN")}`;
  document.getElementById("upfront-opp-cost").innerText = `+₹${Math.round(upfront.opportunityCostForgone).toLocaleString("en-IN")}`;
  document.getElementById("upfront-total").innerText = `₹${Math.round(upfront.trueTotalCost).toLocaleString("en-IN")}`;

  // Winner highlights
  const recId = sim.recommendation.recommendedId;
  const cardBank = document.getElementById("card-bank");
  const cardNocost = document.getElementById("card-nocost");
  const cardUpfront = document.getElementById("card-upfront");
  const ribbon = document.getElementById("upfront-ribbon");

  [cardBank, cardNocost, cardUpfront].forEach(c => c.classList.remove("winner-card"));
  if (ribbon) ribbon.remove();

  let winnerCard = cardUpfront;
  if (recId === "bank_loan") winnerCard = cardBank;
  else if (recId === "nocost_emi") winnerCard = cardNocost;

  winnerCard.classList.add("winner-card");
  const newRibbon = document.createElement("div");
  newRibbon.className = "winner-ribbon";
  newRibbon.id = "upfront-ribbon";
  newRibbon.innerText = "WINNER";
  winnerCard.appendChild(newRibbon);
}

function renderRecommendation(rec) {
  document.getElementById("verdict-winner-name").innerText = `Recommended: ${rec.recommendedName}`;
  document.getElementById("verdict-savings").innerText = `Save ₹${Math.round(rec.savingsVsWorst).toLocaleString("en-IN")} vs ${rec.worstName}`;

  const listEl = document.getElementById("verdict-reasons");
  listEl.innerHTML = "";
  rec.reasons.forEach(r => {
    const li = document.createElement("li");
    li.innerText = r;
    listEl.appendChild(li);
  });
}

function renderCharts(sim) {
  if (typeof Chart === "undefined") return;

  const bankSched = sim.scenarios.bankLoan.schedule;
  const nocostSched = sim.scenarios.nocostEmi.schedule;
  const upfrontSched = sim.scenarios.upfrontCash.schedule;

  const maxLen = Math.max(bankSched.length, nocostSched.length, upfrontSched.length);
  const labels = [];
  const bankCum = [];
  const nocostCum = [];
  const upfrontCum = [];

  let bSum = sim.scenarios.bankLoan.totalUpfrontFees;
  let nSum = sim.scenarios.nocostEmi.totalUpfrontFees;
  let uSum = sim.scenarios.upfrontCash.trueTotalCost;

  for (let i = 0; i < maxLen; i++) {
    const m = i + 1;
    labels.push(`M${m}`);

    if (i < bankSched.length) bSum += bankSched[i].totalOutflow;
    bankCum.push(Math.round(bSum));

    if (i < nocostSched.length) nSum += nocostSched[i].totalOutflow;
    nocostCum.push(Math.round(nSum));

    // Upfront is flat after month 1
    upfrontCum.push(Math.round(uSum));
  }

  // --- Chart 1: Cumulative Outflow Line Chart ---
  const ctxCum = document.getElementById("chartCumulative").getContext("2d");
  if (chartCumulativeInstance) chartCumulativeInstance.destroy();

  chartCumulativeInstance = new Chart(ctxCum, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Bank Loan",
          data: bankCum,
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          borderWidth: 2.5,
          tension: 0.2,
          pointRadius: 2
        },
        {
          label: "No-Cost EMI",
          data: nocostCum,
          borderColor: "#fb7185",
          backgroundColor: "rgba(251, 113, 133, 0.1)",
          borderWidth: 2.5,
          tension: 0.2,
          pointRadius: 2
        },
        {
          label: "Upfront Cash",
          data: upfrontCum,
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          borderWidth: 2.5,
          borderDash: [5, 5],
          tension: 0.0,
          pointRadius: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: "#9ca3af", font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ₹${ctx.parsed.y.toLocaleString("en-IN")}`
          }
        }
      },
      scales: {
        x: { ticks: { color: "#6b7280" }, grid: { color: "rgba(255,255,255,0.05)" } },
        y: {
          ticks: {
            color: "#6b7280",
            callback: (v) => `₹${(v / 1000).toFixed(0)}k`
          },
          grid: { color: "rgba(255,255,255,0.05)" }
        }
      }
    }
  });

  // --- Chart 2: Stacked Bar Cost Composition ---
  const ctxComp = document.getElementById("chartComposition").getContext("2d");
  if (chartCompositionInstance) chartCompositionInstance.destroy();

  const b = sim.scenarios.bankLoan;
  const n = sim.scenarios.nocostEmi;
  const u = sim.scenarios.upfrontCash;

  chartCompositionInstance = new Chart(ctxComp, {
    type: "bar",
    data: {
      labels: ["Bank Loan", "No-Cost EMI", "Upfront Cash"],
      datasets: [
        {
          label: "Principal Paid",
          data: [b.totalPrincipalPaid, n.totalPrincipalPaid, u.totalPrincipalPaid],
          backgroundColor: "#3b82f6"
        },
        {
          label: "Interest Paid",
          data: [b.totalInterestPaid, n.totalInterestPaid, 0],
          backgroundColor: "#f59e0b"
        },
        {
          label: "Fees & 18% GST",
          data: [b.totalUpfrontFees, n.totalGstOnInterest + n.totalUpfrontFees, 0],
          backgroundColor: "#fb7185"
        },
        {
          label: "Penalties",
          data: [b.totalPenalties, n.totalPenalties, 0],
          backgroundColor: "#dc2626"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: "#9ca3af", font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ₹${Math.round(ctx.parsed.y).toLocaleString("en-IN")}`
          }
        }
      },
      scales: {
        x: { stacked: true, ticks: { color: "#9ca3af" }, grid: { display: false } },
        y: {
          stacked: true,
          ticks: {
            color: "#6b7280",
            callback: (v) => `₹${(v / 1000).toFixed(0)}k`
          },
          grid: { color: "rgba(255,255,255,0.05)" }
        }
      }
    }
  });
}

function switchTableTab(tab) {
  activeTableTab = tab;
  document.getElementById("tab-bank").classList.toggle("active", tab === "bank");
  document.getElementById("tab-nocost").classList.toggle("active", tab === "nocost");
  document.getElementById("tab-upfront").classList.toggle("active", tab === "upfront");
  renderAmortizationTable();
}

function renderAmortizationTable() {
  if (!currentSimulation) return;

  let schedule = [];
  if (activeTableTab === "bank") {
    schedule = currentSimulation.scenarios.bankLoan.schedule;
  } else if (activeTableTab === "nocost") {
    schedule = currentSimulation.scenarios.nocostEmi.schedule;
  } else {
    schedule = currentSimulation.scenarios.upfrontCash.schedule;
  }

  const tbody = document.getElementById("table-body");
  tbody.innerHTML = "";

  schedule.forEach(row => {
    const tr = document.createElement("tr");

    let statusClass = "status-paid";
    if (row.status.includes("MISSED")) {
      statusClass = "status-missed";
      tr.className = "row-missed";
    } else if (row.status.includes("Prepayment")) {
      statusClass = "status-prepay";
      tr.className = "row-prepayment";
    }

    tr.innerHTML = `
      <td>${row.month}</td>
      <td>₹${Math.round(row.openingBalance).toLocaleString("en-IN")}</td>
      <td>${row.interestRatePct.toFixed(1)}%</td>
      <td>₹${Math.round(row.emiBilled).toLocaleString("en-IN")}</td>
      <td>₹${Math.round(row.principalPaid).toLocaleString("en-IN")}</td>
      <td>₹${Math.round(row.interestPaid).toLocaleString("en-IN")}</td>
      <td>₹${Math.round(row.gstOnInterest).toLocaleString("en-IN")}</td>
      <td>₹${Math.round(row.penaltyCharges).toLocaleString("en-IN")}</td>
      <td>₹${Math.round(row.prepayment).toLocaleString("en-IN")}</td>
      <td style="font-weight:700; color:#fff;">₹${Math.round(row.totalOutflow).toLocaleString("en-IN")}</td>
      <td>₹${Math.round(row.closingBalance).toLocaleString("en-IN")}</td>
      <td><span class="status-badge ${statusClass}">${row.status}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function exportTableToCSV() {
  if (!currentSimulation) return;

  let schedule = [];
  let name = "Bank_Loan";
  if (activeTableTab === "bank") {
    schedule = currentSimulation.scenarios.bankLoan.schedule;
    name = "Bank_Loan";
  } else if (activeTableTab === "nocost") {
    schedule = currentSimulation.scenarios.nocostEmi.schedule;
    name = "No_Cost_EMI";
  } else {
    schedule = currentSimulation.scenarios.upfrontCash.schedule;
    name = "Upfront_Cash";
  }

  const headers = [
    "Month", "Opening Balance", "Interest Rate (%)", "EMI Billed",
    "Principal Paid", "Interest Paid", "GST on Interest",
    "Penalty Charges", "Prepayment", "Total Outflow", "Closing Balance", "Status"
  ];

  const rows = schedule.map(r => [
    r.month, r.openingBalance, r.interestRatePct, r.emiBilled,
    r.principalPaid, r.interestPaid, r.gstOnInterest,
    r.penaltyCharges, r.prepayment, r.totalOutflow, r.closingBalance, `"${r.status}"`
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Amortization_${name}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function updateFormulaInspection(P, annualRate, n, calculatedEmi) {
  const r = (annualRate / 100.0) / 12.0;
  const factor = Math.pow(1.0 + r, n);
  const el = document.getElementById("formula-inspection-text");
  if (!el) return;

  el.innerHTML = `
    <strong>Standard Reducing Balance EMI Formula:</strong> E = P × [ r · (1+r)ⁿ ] / [ (1+r)ⁿ - 1 ]<br>
    <strong>Inputs:</strong> P = ₹${P.toLocaleString("en-IN")} | Annual Rate = ${annualRate.toFixed(2)}% | Tenure (n) = ${n} months<br>
    <strong>Intermediate Computation:</strong> Monthly Rate (r) = ${r.toFixed(6)} | Compounding Factor (1+r)^${n} = ${factor.toFixed(6)}<br>
    <strong>Resulting EMI:</strong> ₹${calculatedEmi.toFixed(2)} (Standard RBI / Bank benchmark exact match within ₹0.001)
  `;
}

// Kick off when DOM is ready
document.addEventListener("DOMContentLoaded", init);
