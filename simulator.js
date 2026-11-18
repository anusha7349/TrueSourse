/**
 * Pure Mathematical Financial Decision Engine (JavaScript)
 * PS11 - Financial Decision Impact Simulator
 * No external finance libraries used.
 */

function calculateStandardEMI(principal, annualRatePct, tenureMonths) {
    if (tenureMonths <= 0) return 0;
    if (principal <= 0) return 0;
    if (annualRatePct === 0) return principal / tenureMonths;

    const r = (annualRatePct / 100.0) / 12.0;
    const factor = Math.pow(1.0 + r, tenureMonths);
    const emi = principal * r * factor / (factor - 1.0);
    return emi;
}

function calculateAmortizationSchedule(params) {
    const principal = Number(params.principal);
    const annualRatePct = Number(params.annualRatePct);
    const tenureMonths = parseInt(params.tenureMonths, 10);
    const processingFeePct = Number(params.processingFeePct || 0);
    const processingFeeFlat = Number(params.processingFeeFlat || 0);
    const gstPctOnFee = Number(params.gstPctOnFee !== undefined ? params.gstPctOnFee : 18.0);
    const gstPctOnInterest = Number(params.gstPctOnInterest || 0);

    const prepaymentMonth = params.prepaymentMonth ? parseInt(params.prepaymentMonth, 10) : null;
    const prepaymentAmount = Number(params.prepaymentAmount || 0);
    const prepaymentAction = params.prepaymentAction || "reduce_tenure"; // reduce_tenure or reduce_emi

    const missedPaymentMonth = params.missedPaymentMonth ? parseInt(params.missedPaymentMonth, 10) : null;
    const missedPenaltyFlat = Number(params.missedPenaltyFlat || 500);
    const missedPenalRatePct = Number(params.missedPenalRatePct || 24);

    const floatingMonth = params.floatingMonth ? parseInt(params.floatingMonth, 10) : null;
    const floatingNewRate = params.floatingNewRate !== null && params.floatingNewRate !== undefined ? Number(params.floatingNewRate) : null;
    const floatingAction = params.floatingAction || "change_emi";

    let currentPrincipal = principal;
    let currentRate = annualRatePct;
    let initialEmi = calculateStandardEMI(currentPrincipal, currentRate, tenureMonths);
    let activeEmi = initialEmi;

    const procFee = (principal * (processingFeePct / 100.0)) + processingFeeFlat;
    const procFeeGst = procFee * (gstPctOnFee / 100.0);
    const totalUpfrontFees = procFee + procFeeGst;

    const schedule = [];
    let totalInterestPaid = 0.0;
    let totalGstOnInterest = 0.0;
    let totalPenalties = 0.0;
    let totalPrincipalPaid = 0.0;

    let month = 1;
    let isMissed = false;
    const maxMonths = tenureMonths * 3 + 60;

    while (currentPrincipal > 0.001 && month <= maxMonths) {
        // Floating rate adjustment
        if (floatingMonth && month === floatingMonth && floatingNewRate !== null) {
            currentRate = floatingNewRate;
            const remainingTenure = Math.max(1, tenureMonths - month + 1);
            if (floatingAction === "change_emi") {
                activeEmi = calculateStandardEMI(currentPrincipal, currentRate, remainingTenure);
            }
        }

        const monthlyRate = (currentRate / 100.0) / 12.0;
        const openingBalance = currentPrincipal;
        const regularInterest = openingBalance * monthlyRate;
        let penalInterest = 0.0;
        let penaltyFee = 0.0;

        // Missed payment
        if (missedPaymentMonth && month === missedPaymentMonth) {
            isMissed = true;
            penaltyFee = missedPenaltyFlat * (1 + (gstPctOnFee / 100.0));
            currentPrincipal += regularInterest + penaltyFee;
            totalPenalties += penaltyFee;
            totalInterestPaid += regularInterest;

            schedule.push({
                month,
                openingBalance: Number(openingBalance.toFixed(2)),
                interestRatePct: Number(currentRate.toFixed(2)),
                emiBilled: 0.0,
                principalPaid: 0.0,
                interestPaid: Number(regularInterest.toFixed(2)),
                gstOnInterest: 0.0,
                penaltyCharges: Number(penaltyFee.toFixed(2)),
                prepayment: 0.0,
                totalOutflow: 0.0,
                closingBalance: Number(currentPrincipal.toFixed(2)),
                status: "MISSED (Penalty Applied)"
            });
            month++;
            continue;
        }

        if (isMissed && month === (missedPaymentMonth + 1)) {
            const penalMonthlyRate = (missedPenalRatePct / 100.0) / 12.0;
            penalInterest = activeEmi * penalMonthlyRate;
            totalPenalties += penalInterest;
            isMissed = false;
        }

        const interestThisMonth = regularInterest + penalInterest;
        const gstInterest = interestThisMonth * (gstPctOnInterest / 100.0);

        let principalPaid = 0;
        if (activeEmi > interestThisMonth) {
            principalPaid = activeEmi - interestThisMonth;
        }

        let actualEmi = activeEmi;
        if (principalPaid >= currentPrincipal) {
            principalPaid = currentPrincipal;
            actualEmi = principalPaid + interestThisMonth;
        }

        currentPrincipal -= principalPaid;

        let actualPrepayment = 0.0;
        if (prepaymentMonth && month === prepaymentMonth && prepaymentAmount > 0) {
            actualPrepayment = Math.min(prepaymentAmount, currentPrincipal);
            currentPrincipal -= actualPrepayment;

            if (prepaymentAction === "reduce_emi" && currentPrincipal > 0) {
                const remainingMonths = Math.max(1, tenureMonths - month);
                activeEmi = calculateStandardEMI(currentPrincipal, currentRate, remainingMonths);
            }
        }

        const monthOutflow = actualEmi + gstInterest + actualPrepayment + penaltyFee;
        totalPrincipalPaid += principalPaid + actualPrepayment;
        totalInterestPaid += interestThisMonth;
        totalGstOnInterest += gstInterest;

        schedule.push({
            month,
            openingBalance: Number(openingBalance.toFixed(2)),
            interestRatePct: Number(currentRate.toFixed(2)),
            emiBilled: Number(actualEmi.toFixed(2)),
            principalPaid: Number(principalPaid.toFixed(2)),
            interestPaid: Number(interestThisMonth.toFixed(2)),
            gstOnInterest: Number(gstInterest.toFixed(2)),
            penaltyCharges: Number((penaltyFee + penalInterest).toFixed(2)),
            prepayment: Number(actualPrepayment.toFixed(2)),
            totalOutflow: Number(monthOutflow.toFixed(2)),
            closingBalance: Number(Math.max(0, currentPrincipal).toFixed(2)),
            status: actualPrepayment === 0 ? "PAID" : `PAID + Prepayment ₹${actualPrepayment.toLocaleString("en-IN")}`
        });

        if (currentPrincipal <= 0.001) break;
        month++;
    }

    const actualTenureMonths = schedule.length;
    const totalEmiPaid = schedule.reduce((sum, row) => sum + row.emiBilled, 0);
    const totalPrepayments = schedule.reduce((sum, row) => sum + row.prepayment, 0);
    const totalCashOutflow = totalEmiPaid + totalPrepayments + totalGstOnInterest + totalPenalties + totalUpfrontFees;

    return {
        initialEmi: Number(initialEmi.toFixed(2)),
        actualTenureMonths,
        tenureDeltaMonths: actualTenureMonths - tenureMonths,
        principal: Number(principal.toFixed(2)),
        totalPrincipalPaid: Number(totalPrincipalPaid.toFixed(2)),
        totalInterestPaid: Number(totalInterestPaid.toFixed(2)),
        totalGstOnInterest: Number(totalGstOnInterest.toFixed(2)),
        processingFee: Number(procFee.toFixed(2)),
        processingFeeGst: Number(procFeeGst.toFixed(2)),
        totalUpfrontFees: Number(totalUpfrontFees.toFixed(2)),
        totalPenalties: Number(totalPenalties.toFixed(2)),
        trueTotalCost: Number(totalCashOutflow.toFixed(2)),
        schedule
    };
}

function compareThreeScenariosJS(config) {
    const productPrice = Number(config.productPrice || 100000);
    const tenureMonths = parseInt(config.tenureMonths || 12, 10);
    const bankInterestRatePct = Number(config.bankInterestRatePct || 12.0);
    const bankProcFeePct = Number(config.bankProcFeePct || 1.5);
    const nocostDiscountRatePct = Number(config.nocostDiscountRatePct || 15.0);
    const nocostProcFeeFlat = Number(config.nocostProcFeeFlat || 199.0);
    const upfrontInstantDiscountPct = Number(config.upfrontInstantDiscountPct || 3.0);
    const opportunityReturnAnnualPct = Number(config.opportunityReturnAnnualPct || 7.0);

    const prepaymentMonth = config.prepaymentMonth ? parseInt(config.prepaymentMonth, 10) : null;
    const prepaymentAmount = Number(config.prepaymentAmount || 0);
    const prepaymentAction = config.prepaymentAction || "reduce_tenure";
    const missedPaymentMonth = config.missedPaymentMonth ? parseInt(config.missedPaymentMonth, 10) : null;
    const floatingMonth = config.floatingMonth ? parseInt(config.floatingMonth, 10) : null;
    const floatingNewRate = config.floatingNewRate ? Number(config.floatingNewRate) : null;

    // 1. Bank Loan
    const scenarioA = calculateAmortizationSchedule({
        principal: productPrice,
        annualRatePct: bankInterestRatePct,
        tenureMonths,
        processingFeePct: bankProcFeePct,
        processingFeeFlat: 0,
        gstPctOnFee: 18.0,
        gstPctOnInterest: 0.0,
        prepaymentMonth,
        prepaymentAmount,
        prepaymentAction,
        missedPaymentMonth,
        floatingMonth,
        floatingNewRate
    });
    scenarioA.name = "Bank Personal Loan";
    scenarioA.tagline = `${bankInterestRatePct}% p.a. with ${bankProcFeePct}% processing fee`;

    // 2. No-Cost EMI
    const monthlyNocostR = (nocostDiscountRatePct / 100.0) / 12.0;
    const factor = Math.pow(1.0 + monthlyNocostR, tenureMonths);
    const targetEmi = productPrice / tenureMonths;
    const financedPrincipal = targetEmi * (factor - 1.0) / (monthlyNocostR * factor);
    const upfrontMerchantDiscount = productPrice - financedPrincipal;

    const scenarioB = calculateAmortizationSchedule({
        principal: financedPrincipal,
        annualRatePct: nocostDiscountRatePct,
        tenureMonths,
        processingFeePct: 0.0,
        processingFeeFlat: nocostProcFeeFlat,
        gstPctOnFee: 18.0,
        gstPctOnInterest: 18.0,
        prepaymentMonth,
        prepaymentAmount,
        prepaymentAction,
        missedPaymentMonth,
        floatingMonth,
        floatingNewRate
    });
    scenarioB.name = "No-Cost EMI";
    scenarioB.tagline = "Advertised 0% interest, but charges 18% GST on interest + card fees";
    scenarioB.merchantUpfrontDiscount = Number(upfrontMerchantDiscount.toFixed(2));
    scenarioB.financedPrincipal = Number(financedPrincipal.toFixed(2));

    // 3. Upfront Cash
    const instantDiscount = productPrice * (upfrontInstantDiscountPct / 100.0);
    const actualUpfrontCash = productPrice - instantDiscount;
    const monthlyOppR = (opportunityReturnAnnualPct / 100.0) / 12.0;
    const futureValue = actualUpfrontCash * Math.pow(1.0 + monthlyOppR, tenureMonths);
    const opportunityCostEarned = futureValue - actualUpfrontCash;

    const upfrontSchedule = [];
    for (let m = 1; m <= tenureMonths; m++) {
        upfrontSchedule.push({
            month: m,
            openingBalance: 0,
            interestRatePct: 0,
            emiBilled: 0,
            principalPaid: m === 1 ? actualUpfrontCash : 0,
            interestPaid: 0,
            gstOnInterest: 0,
            penaltyCharges: 0,
            prepayment: 0,
            totalOutflow: m === 1 ? actualUpfrontCash : 0,
            closingBalance: 0,
            status: m === 1 ? "PAID UPFRONT" : "NO DUES"
        });
    }

    const scenarioC = {
        name: "Upfront Cash Payment",
        tagline: `${upfrontInstantDiscountPct}% cash discount, 0 interest, 0 fees`,
        initialEmi: 0,
        actualTenureMonths: 1,
        tenureDeltaMonths: 0,
        principal: Number(actualUpfrontCash.toFixed(2)),
        instantDiscount: Number(instantDiscount.toFixed(2)),
        totalPrincipalPaid: Number(actualUpfrontCash.toFixed(2)),
        totalInterestPaid: 0,
        totalGstOnInterest: 0,
        processingFee: 0,
        processingFeeGst: 0,
        totalUpfrontFees: 0,
        totalPenalties: 0,
        opportunityCostForgone: Number(opportunityCostEarned.toFixed(2)),
        trueTotalCost: Number(actualUpfrontCash.toFixed(2)),
        trueTotalCostWithOppCost: Number((actualUpfrontCash + opportunityCostEarned).toFixed(2)),
        schedule: upfrontSchedule
    };

    // Recommendation
    const options = [
        { id: "upfront_cash", name: scenarioC.name, cost: scenarioC.trueTotalCost, oppCost: scenarioC.trueTotalCostWithOppCost },
        { id: "nocost_emi", name: scenarioB.name, cost: scenarioB.trueTotalCost, oppCost: scenarioB.trueTotalCost },
        { id: "bank_loan", name: scenarioA.name, cost: scenarioA.trueTotalCost, oppCost: scenarioA.trueTotalCost }
    ];

    options.sort((a, b) => a.cost - b.cost);
    const winner = options[0];
    const worst = options[options.length - 1];
    const savings = Number((worst.cost - winner.cost).toFixed(2));

    const nocostHidden = scenarioB.totalGstOnInterest + scenarioB.totalUpfrontFees;
    const bankHidden = scenarioA.totalInterestPaid + scenarioA.totalUpfrontFees;

    const reasons = [];
    if (winner.id === "upfront_cash") {
        reasons.push(`Upfront cash saves ₹${savings.toLocaleString("en-IN")} vs the highest cost option (${worst.name}).`);
        reasons.push(`Bypasses ₹${bankHidden.toLocaleString("en-IN")} in cumulative bank interest and processing charges.`);
        reasons.push(`Exposes the 'No-Cost' trap: No-Cost EMI secretly costs an extra ₹${nocostHidden.toLocaleString("en-IN")} in 18% GST on interest + convenience fee.`);
        reasons.push(`Even after factoring in ${opportunityReturnAnnualPct}% opportunity return (₹${scenarioC.opportunityCostForgone.toLocaleString("en-IN")}), upfront cash is still mathematically superior.`);
    } else if (winner.id === "nocost_emi") {
        reasons.push(`No-Cost EMI is lowest out-of-pocket at ₹${winner.cost.toLocaleString("en-IN")}.`);
        reasons.push(`Note: You still pay ₹${nocostHidden.toLocaleString("en-IN")} in mandatory GST on monthly interest + processing fee.`);
    } else {
        reasons.push(`Bank loan provides the optimal cash distribution under your specified parameter set.`);
    }

    return {
        productPrice,
        tenureMonths,
        scenarios: {
            bankLoan: scenarioA,
            nocostEmi: scenarioB,
            upfrontCash: scenarioC
        },
        recommendation: {
            recommendedId: winner.id,
            recommendedName: winner.name,
            winnerTotalCost: winner.cost,
            savingsVsWorst: savings,
            worstName: worst.name,
            reasons,
            summary: reasons.slice(0, 2).join(" ")
        }
    };
}
