// Get references to DOM elements
const grossIncomeInput = document.getElementById('gross-income');
const employedTakeHomeSpan = document.getElementById('employed-take-home');
const employedDisposableSpan = document.getElementById('employed-disposable');
const soleTraderTakeHomeSpan = document.getElementById('sole-trader-take-home');
const soleTraderDisposableSpan = document.getElementById('sole-trader-disposable');
const ltdCompanyTakeHomeSpan = document.getElementById('ltd-company-take-home');
const ltdCompanyDisposableSpan = document.getElementById('ltd-company-disposable');
const monthlyExpensesInput = document.getElementById('monthly-expenses');
// Added Ltd Company specific inputs
const ltdSalaryInput = document.getElementById('ltd-salary');
const ltdExpensesInput = document.getElementById('ltd-expenses'); // Ltd Co business expenses
const ltdDividendsInput = document.getElementById('ltd-dividends');
const stExpensesInput = document.getElementById('st-expenses'); // Sole Trader business expenses
// Added Pension Inputs
const employedPensionPctInput = document.getElementById('employed-pension-pct');
const stPensionPctInput = document.getElementById('st-pension-pct');
const ltdEmployerPensionInput = document.getElementById('ltd-employer-pension');
// Added BiK Inputs
const employedBikInput = document.getElementById('employed-bik');
const ltdBikInput = document.getElementById('ltd-bik');
// Added Deduction Spans
const employedTaxSpan = document.getElementById('employed-tax');
const employedNiSpan = document.getElementById('employed-ni');
const employedPensionContribSpan = document.getElementById('employed-pension-contrib');
const stProfitSpan = document.getElementById('st-profit');
const stTaxSpan = document.getElementById('st-tax');
const stNi4Span = document.getElementById('st-ni4');
const stPensionContribSpan = document.getElementById('st-pension-contrib');
const ltdCorpTaxSpan = document.getElementById('ltd-corp-tax');
const ltdEmpNiSalarySpan = document.getElementById('ltd-emp-ni-salary');
const ltdEmpNiBikSpan = document.getElementById('ltd-emp-ni-bik');
const ltdPersTaxSpan = document.getElementById('ltd-pers-tax');
const ltdPersNiSpan = document.getElementById('ltd-pers-ni');
const ltdActualDividendsSpan = document.getElementById('ltd-actual-dividends');


// --- Configuration (UK Tax Year 2024/2025 - England/NI) ---
// It's crucial to keep these updated!
const TAX_CONFIG = {
    // Income Tax
    personalAllowance: 12570,
    basicRateLimit: 50270, // PA + Basic Rate Band
    higherRateLimit: 125140, // PA + Basic + Higher Rate Bands
    basicRate: 0.20,
    higherRate: 0.40,
    additionalRate: 0.45,
    paTaperThreshold: 100000,

    // National Insurance (Class 1 - Employee)
    niClass1_PT: 12570, // Annual Primary Threshold
    niClass1_UEL: 50270, // Annual Upper Earnings Limit
    niClass1_RateBelowUEL: 0.08, // 8% (from April 2024)
    niClass1_RateAboveUEL: 0.02,

    // National Insurance (Self-Employed)
    niClass2_LPL: 12570, // Lower Profits Limit (Threshold for mandatory payment/credits)
    // Class 2 Rate is effectively £0 for 24/25 if profits >= LPL, but treated as paid for credits.
    // Voluntary rate if below LPL/SPT is £3.45/week, but we'll ignore voluntary for simplicity.
    niClass4_LPL: 12570, // Lower Profits Limit
    niClass4_UPL: 50270, // Upper Profits Limit
    niClass4_RateBelowUPL: 0.06, // 6% (from April 2024)
    niClass4_RateAboveUPL: 0.02,

    // Corporation Tax (24/25) - Simplified: using main rate, ignoring small profits rate for now
    corporationTaxRate: 0.25, // Main rate for profits over £250k (Small profits rate is 19% up to £50k, tapered)
    // For simplicity in this tool, we'll apply 19% if profit < 50k, 25% otherwise. A proper taper is complex.
    ctSmallProfitThreshold: 50000,
    ctSmallProfitRate: 0.19,


    // Employer National Insurance (Class 1 Secondary)
    niEmployer_ST: 9100, // Annual Secondary Threshold (£175/week)
    niEmployer_Rate: 0.138, // 13.8%

    // Dividend Tax
    dividendAllowance: 500, // £500 for 24/25
    dividendBasicRate: 0.0875, // 8.75%
    dividendHigherRate: 0.3375, // 33.75%
    dividendAdditionalRate: 0.3935, // 39.35%

    // Class 1A National Insurance (Employer on BiKs)
    niClass1A_Rate: 0.138, // 13.8% (Same as Employer Class 1 Secondary rate)
};

// --- Helper Function: Calculate Income Tax ---
function calculateIncomeTax(income, config) {
    let taxableIncome = income;
    let personalAllowance = config.personalAllowance;

    // Taper Personal Allowance for high earners
    if (income > config.paTaperThreshold) {
        const reduction = Math.floor((income - config.paTaperThreshold) / 2);
        personalAllowance = Math.max(0, config.personalAllowance - reduction);
    }

    taxableIncome = Math.max(0, income - personalAllowance);

    let tax = 0;
    const basicRateBand = config.basicRateLimit - config.personalAllowance; // 37700
    const higherRateBand = config.higherRateLimit - config.basicRateLimit; // 74870

    // Additional Rate Tax
    if (taxableIncome > config.higherRateLimit - personalAllowance) {
         const incomeInBand = taxableIncome - (config.higherRateLimit - personalAllowance);
         tax += incomeInBand * config.additionalRate;
         taxableIncome -= incomeInBand;
    }

     // Higher Rate Tax
    if (taxableIncome > basicRateBand) {
        const incomeInBand = taxableIncome - basicRateBand;
        tax += incomeInBand * config.higherRate;
        taxableIncome -= incomeInBand;
    }

    // Basic Rate Tax
    if (taxableIncome > 0) {
        tax += taxableIncome * config.basicRate;
    }

    return tax;
}

// --- Helper Function: Calculate Employee NI (Class 1) ---
function calculateEmployeeNI(income, config) {
    let ni = 0;
    const incomeAbovePT = Math.max(0, income - config.niClass1_PT);

    if (incomeAbovePT > 0) {
        const incomeBelowUEL = Math.min(incomeAbovePT, config.niClass1_UEL - config.niClass1_PT);
        ni += incomeBelowUEL * config.niClass1_RateBelowUEL;

        const incomeAboveUEL = Math.max(0, incomeAbovePT - (config.niClass1_UEL - config.niClass1_PT));
        ni += incomeAboveUEL * config.niClass1_RateAboveUEL;
    }
    return ni;
}

// --- Helper Function: Calculate Self-Employed NI (Class 2 & 4) ---
// Note: Class 2 is £0 for 24/25 if profits >= LPL, but provides credit. We return 0 cost.
function calculateSelfEmployedNI(profit, config) {
    let class2NI = 0; // Effectively zero cost if profit >= LPL for 24/25
    let class4NI = 0;

    // Class 4 NI Calculation
    const profitAboveLPL = Math.max(0, profit - config.niClass4_LPL);

    if (profitAboveLPL > 0) {
        const profitBelowUPL = Math.min(profitAboveLPL, config.niClass4_UPL - config.niClass4_LPL);
        class4NI += profitBelowUPL * config.niClass4_RateBelowUPL;

        const profitAboveUPL = Math.max(0, profitAboveLPL - (config.niClass4_UPL - config.niClass4_LPL));
        class4NI += profitAboveUPL * config.niClass4_RateAboveUPL;
    }

    // We don't add Class 2 cost here for 24/25 assuming profit >= LPL
    const totalNI = class2NI + class4NI;
    return { class2NI, class4NI, totalNI };
}

// --- Helper Function: Calculate Dividend Tax ---
function calculateDividendTax(dividends, remainingPersonalAllowance, remainingBasicRateBand, remainingHigherRateBand, config) {
    let tax = 0;
    let taxableDividends = dividends;

    // Use dividend allowance first
    const allowanceUsed = Math.min(taxableDividends, config.dividendAllowance);
    taxableDividends -= allowanceUsed;

    if (taxableDividends <= 0) return 0;

    // Use any remaining Personal Allowance
    const paUsed = Math.min(taxableDividends, remainingPersonalAllowance);
    taxableDividends -= paUsed;

    if (taxableDividends <= 0) return tax;

    // Tax at Basic Rate (using remaining basic band)
    const basicTaxable = Math.min(taxableDividends, remainingBasicRateBand);
    tax += basicTaxable * config.dividendBasicRate;
    taxableDividends -= basicTaxable;

    if (taxableDividends <= 0) return tax;

    // Tax at Higher Rate (using remaining higher band)
    const higherTaxable = Math.min(taxableDividends, remainingHigherRateBand);
    tax += higherTaxable * config.dividendHigherRate;
    taxableDividends -= higherTaxable;

    if (taxableDividends <= 0) return tax;

    // Tax at Additional Rate (remaining dividends)
    tax += taxableDividends * config.dividendAdditionalRate;

    return tax;
}


// --- Calculation Functions ---
// Updated functions to accept pension and BiK inputs

// Added employeePensionContribution and bikValue parameters
function calculateEmployed(grossIncome, annualPersonalExpenses, employeePensionContribution, bikValue) {
    // Income subject to tax includes gross income + BiK, less pension relief
    const incomeForTaxCalc = Math.max(0, grossIncome + bikValue - employeePensionContribution);
    // NI (Class 1) is calculated on gross cash earnings, excluding BiK
    const nationalInsurance = calculateEmployeeNI(grossIncome, TAX_CONFIG);
    // Tax is calculated on the adjusted income (incl. BiK, less pension)
    const incomeTax = calculateIncomeTax(incomeForTaxCalc, TAX_CONFIG);

    const deductions = incomeTax + nationalInsurance;
    // Take home is gross cash income minus tax, NI, AND pension contribution. BiK value isn't cash received.
    const takeHome = grossIncome - deductions - employeePensionContribution;

    // Calculate annual disposable income
    const disposable = Math.max(0, takeHome - annualPersonalExpenses); // Ensure non-negative
    console.log(`Employed - Gross: ${grossIncome}, Pension: ${employeePensionContribution}, BiK: ${bikValue}, Tax: ${incomeTax}, NI: ${nationalInsurance}, Take Home: ${takeHome}, Disposable: ${disposable}`); // Log for debugging
    return { takeHome, disposable, incomeTax, nationalInsurance, employeePensionContribution, bikValue }; // Return breakdown too
}

// Added stPensionContribution parameter (BiK not applicable to Sole Trader income itself)
function calculateSoleTrader(grossIncome, stBusinessExpenses, annualPersonalExpenses, stPensionContribution) {
    // Calculate profit first
    const profitBeforePension = Math.max(0, grossIncome - stBusinessExpenses);

    // Profit for Tax calculation is reduced by pension contribution
    const profitForTaxCalc = Math.max(0, profitBeforePension - stPensionContribution);

    // Calculate tax and NI based on the reduced profit
    const incomeTax = calculateIncomeTax(profitForTaxCalc, TAX_CONFIG);
    // Self-employed NI is also calculated on profit after pension relief
    const niResult = calculateSelfEmployedNI(profitForTaxCalc, TAX_CONFIG);
    const nationalInsurance = niResult.totalNI; // Sum of Class 2 (0) and Class 4

    const deductions = incomeTax + nationalInsurance;
    // Take home is profit before pension, minus tax, NI, AND the pension contribution
    const takeHome = profitBeforePension - deductions - stPensionContribution;

    // Calculate annual disposable income based on personal expenses
    const disposable = Math.max(0, takeHome - annualPersonalExpenses); // Ensure non-negative
    console.log(`Sole Trader - Gross: ${grossIncome}, Expenses: ${stBusinessExpenses}, Profit B4 Pension: ${profitBeforePension}, Pension: ${stPensionContribution}, Tax: ${incomeTax}, NI: ${nationalInsurance}, Take Home: ${takeHome}, Disposable: ${disposable}`); // Log for debugging
    return { takeHome, disposable, incomeTax, nationalInsurance, profit: profitBeforePension, stPensionContribution }; // Return breakdown
}

// Added ltdEmployerPensionContribution and ltdBikValue parameters
function calculateLtdCompany(turnover, salary, businessExpenses, ltdEmployerPensionContribution, ltdBikValue, requestedDividends, annualPersonalExpenses, config = TAX_CONFIG) {

    // --- Company Calculations ---
    // Employer Class 1A NICs on Benefits in Kind
    const employerClass1ANICs = ltdBikValue * config.niClass1A_Rate;

    // Profit before Salary, Employer NI (on Salary), Employer Pension, and Class 1A NICs (on BiK)
    const profitBeforeSalaryEtc = Math.max(0, turnover - businessExpenses);

    // Employer NI on Salary (Class 1 Secondary)
    const employerNIOnSalary = Math.max(0, salary - config.niEmployer_ST) * config.niEmployer_Rate;

    // Profit subject to Corporation Tax (reduced by salary, employer NI, employer pension, AND Class 1A NICs)
    const profitForCT = Math.max(0, profitBeforeSalaryEtc - salary - employerNIOnSalary - ltdEmployerPensionContribution - employerClass1ANICs);

    // Corporation Tax Calculation (Simplified Rate)
    let corporationTax = 0;
    if (profitForCT > 0) {
        const rate = profitForCT <= config.ctSmallProfitThreshold ? config.ctSmallProfitRate : config.corporationTaxRate;
        corporationTax = profitForCT * rate;
    }

    // Profit available for dividends (after CT)
    const profitAvailableForDividends = Math.max(0, profitForCT - corporationTax);

    // Validate and cap requested dividends
    const actualDividends = Math.min(requestedDividends, profitAvailableForDividends);
    // Optional: Provide feedback if dividends were capped (e.g., console log or UI message)
    if (requestedDividends > profitAvailableForDividends) {
        console.warn(`Requested dividends (£${requestedDividends}) exceed available profit after tax (£${profitAvailableForDividends}). Capping dividends.`);
        // Consider updating the input field value visually? For now, just use the capped value.
        // ltdDividendsInput.value = actualDividends.toFixed(0); // This could be jarring, maybe just a message.
    }

    // --- Personal Calculations ---
    // Income subject to personal tax includes salary + BiK + dividends
    const totalIncomeForPersonalTax = salary + ltdBikValue + actualDividends;

    // Taper PA based on *total* income (salary + BiK + actual dividends)
    let personalAllowance = config.personalAllowance;
     if (totalIncomeForPersonalTax > config.paTaperThreshold) {
        const reduction = Math.floor((totalPersonalIncome - config.paTaperThreshold) / 2);
        personalAllowance = Math.max(0, config.personalAllowance - reduction);
    }

    // Income Tax calculation needs to consider Salary + BiK first, then dividends
    // Calculate tax on (Salary + BiK) portion
    const incomeForSalaryTaxCalc = salary + ltdBikValue;
    const salaryAndBikTax = calculateIncomeTax(incomeForSalaryTaxCalc, config);

    // Employee NI on Salary (Class 1 Primary) - BiK is excluded from Employee NI
    const employeeNIOnSalary = calculateEmployeeNI(salary, config);

    // Calculate remaining PA and tax bands *after* (Salary + BiK) have used them
    const paUsedBySalaryAndBik = Math.min(incomeForSalaryTaxCalc, personalAllowance);
    const remainingPAForDividends = personalAllowance - paUsedBySalaryAndBik;

    const basicRateBand = config.basicRateLimit - config.personalAllowance;
    const higherRateBand = config.higherRateLimit - config.basicRateLimit;

    // How much of the basic band is used by taxable (Salary + BiK)
    const basicBandUsedBySalaryAndBik = Math.max(0, incomeForSalaryTaxCalc - personalAllowance);
    const remainingBasicRateBandForDividends = Math.max(0, basicRateBand - basicBandUsedBySalaryAndBik);

    // How much of the higher band is used by taxable (Salary + BiK)
    const higherBandUsedBySalaryAndBik = Math.max(0, incomeForSalaryTaxCalc - config.basicRateLimit);
    const remainingHigherRateBandForDividends = Math.max(0, higherRateBand - higherBandUsedBySalaryAndBik);


    // Dividend Tax (calculated on actual dividends using remaining bands/allowance)
    const dividendTax = calculateDividendTax(actualDividends, remainingPAForDividends, remainingBasicRateBandForDividends, remainingHigherRateBandForDividends, config);

    // Total Personal Tax = Tax on (Salary + BiK) + Tax on Dividends
    const totalPersonalTax = salaryAndBikTax + dividendTax;
    const totalPersonalNI = employeeNIOnSalary; // Only on salary

    // Take-Home Pay = Cash Received (Salary + Actual Dividends) - Personal Tax - Personal NI
    const takeHome = salary + actualDividends - totalPersonalTax - totalPersonalNI;

    // Calculate annual disposable income based on personal expenses
    const disposable = Math.max(0, takeHome - annualPersonalExpenses); // Ensure non-negative

    console.log(`Ltd Co - Turnover: ${turnover}, Expenses: ${businessExpenses}, Salary: ${salary}, Emp NI: ${employerNIOnSalary}, CT Profit: ${profitForCT}, Corp Tax: ${corporationTax}, Avail Div: ${profitAvailableForDividends}, Actual Div: ${actualDividends}, Pers Tax: ${totalPersonalTax}, Pers NI: ${totalPersonalNI}, Take Home: ${takeHome}, Disposable: ${disposable}`);
    // Return detailed breakdown, including pension
    return {
        takeHome,
        disposable,
        salary,
        actualDividends, // Return the potentially capped amount
        corporationTax,
        employerNIOnSalary, // On Salary
        employerClass1ANICs, // On BiK
        ltdEmployerPensionContribution,
        ltdBikValue, // Value of BiK provided
        totalPersonalTax,
        totalPersonalNI,
        profitAvailableForDividends // Useful for potential UI feedback
    };
}

// --- Update Display Function ---
// Updated to accept all relevant inputs, including pension and BiK inputs
function updateDisplay(grossIncome, annualPersonalExpenses, employedPensionPct, employedBik, stExpenses, stPensionPct, ltdSalary, ltdExpenses, ltdEmployerPension, ltdBik, ltdDividends) {
    // Use Intl.NumberFormat for currency formatting - good practice!
    const formatter = new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        minimumFractionDigits: 0, // Show whole pounds for simplicity
        maximumFractionDigits: 0,
    });

    // Calculate pension amounts
    const employedPensionContribution = grossIncome * (employedPensionPct / 100);
    // Calculate ST profit before pension to base ST pension % on
    const stProfitBeforePension = Math.max(0, grossIncome - stExpenses);
    const stPensionContribution = stProfitBeforePension * (stPensionPct / 100);


    const employedResult = calculateEmployed(grossIncome, annualPersonalExpenses, employedPensionContribution, employedBik);
    // Update Employed column in table
    document.getElementById('employed-take-home-cell').textContent = formatter.format(employedResult.takeHome);
    document.getElementById('employed-disposable-cell').textContent = formatter.format(employedResult.disposable);
    document.getElementById('employed-tax-cell').textContent = formatter.format(employedResult.incomeTax);
    document.getElementById('employed-ni-cell').textContent = formatter.format(employedResult.nationalInsurance);
    document.getElementById('employed-pension-contrib-cell').textContent = formatter.format(employedResult.employeePensionContribution);

    // Use grossIncome, stExpenses, and calculated stPensionContribution for sole trader calculation (BiK not directly applicable here)
    const soleTraderResult = calculateSoleTrader(grossIncome, stExpenses, annualPersonalExpenses, stPensionContribution);
     // Update Sole Trader column in table
    document.getElementById('st-take-home-cell').textContent = formatter.format(soleTraderResult.takeHome);
    document.getElementById('st-disposable-cell').textContent = formatter.format(soleTraderResult.disposable);
    document.getElementById('st-tax-cell').textContent = formatter.format(soleTraderResult.incomeTax);
    document.getElementById('st-ni4-cell').textContent = formatter.format(soleTraderResult.nationalInsurance); // Primarily Class 4 NI
    document.getElementById('st-pension-contrib-cell').textContent = formatter.format(soleTraderResult.stPensionContribution);
    document.getElementById('st-profit-cell').textContent = formatter.format(soleTraderResult.profit); // Profit before pension/tax

    // Use detailed inputs for Ltd Co calculation, including employer pension and BiK
    const ltdCompanyResult = calculateLtdCompany(grossIncome, ltdSalary, ltdExpenses, ltdEmployerPension, ltdBik, ltdDividends, annualPersonalExpenses);
    // Update Limited Company column in table
    document.getElementById('ltd-take-home-cell').textContent = formatter.format(ltdCompanyResult.takeHome);
    document.getElementById('ltd-disposable-cell').textContent = formatter.format(ltdCompanyResult.disposable);
    document.getElementById('ltd-pers-tax-cell').textContent = formatter.format(ltdCompanyResult.totalPersonalTax);
    document.getElementById('ltd-pers-ni-cell').textContent = formatter.format(ltdCompanyResult.totalPersonalNI);
    // Company metrics
    document.getElementById('ltd-corp-tax-cell').textContent = formatter.format(ltdCompanyResult.corporationTax);
    document.getElementById('ltd-emp-ni-salary-cell').textContent = formatter.format(ltdCompanyResult.employerNIOnSalary);
    document.getElementById('ltd-emp-ni-bik-cell').textContent = formatter.format(ltdCompanyResult.employerClass1ANICs);
    document.getElementById('ltd-emp-pension-contrib-cell').textContent = formatter.format(ltdCompanyResult.ltdEmployerPensionContribution);
    document.getElementById('ltd-actual-dividends-cell').textContent = formatter.format(ltdCompanyResult.actualDividends);
    // Optional: Update the dividend input visually if it was capped
    // if (ltdDividends !== ltdCompanyResult.actualDividends) {
    //     ltdDividendsInput.value = ltdCompanyResult.actualDividends.toFixed(0);
    // }
}

// --- Helper function to get inputs and trigger update ---
function handleInputChange() {
    const grossIncome = parseFloat(grossIncomeInput.value) || 0;
    const monthlyPersonalExpenses = parseFloat(monthlyExpensesInput.value) || 0;
    const annualPersonalExpenses = monthlyPersonalExpenses * 12;
    // Read Employed inputs
    const employedPensionPct = parseFloat(employedPensionPctInput.value) || 0;
    const employedBik = parseFloat(employedBikInput.value) || 0;
    // Read ST inputs
    const stExpenses = parseFloat(stExpensesInput.value) || 0;
    const stPensionPct = parseFloat(stPensionPctInput.value) || 0;
    // Read Ltd Co inputs
    const ltdSalary = parseFloat(ltdSalaryInput.value) || 0;
    const ltdExpenses = parseFloat(ltdExpensesInput.value) || 0; // Ltd Co business expenses
    const ltdEmployerPension = parseFloat(ltdEmployerPensionInput.value) || 0;
    const ltdBik = parseFloat(ltdBikInput.value) || 0;
    const ltdDividends = parseFloat(ltdDividendsInput.value) || 0;

    updateDisplay(grossIncome, annualPersonalExpenses, employedPensionPct, employedBik, stExpenses, stPensionPct, ltdSalary, ltdExpenses, ltdEmployerPension, ltdBik, ltdDividends);
}

// --- Increment/Decrement and Linking Functionality ---
const linkExpensesCheckbox = document.getElementById('link-expenses');
const monthlyExpensesLinkSelect = document.getElementById('monthly-expenses-link');
const stExpensesLinkSelect = document.getElementById('st-expenses-link');
const ltdExpensesLinkSelect = document.getElementById('ltd-expenses-link');
const ltdSalaryLinkSelect = document.getElementById('ltd-salary-link');
const ltdDividendsLinkSelect = document.getElementById('ltd-dividends-link');

// Handle linking between Sole Trader and Ltd Company expenses
function handleExpensesLinking() {
    if (linkExpensesCheckbox.checked) {
        // When linking is enabled, sync Ltd expenses to match Sole Trader expenses
        ltdExpensesInput.value = stExpensesInput.value;
        ltdExpensesInput.disabled = true; // Disable Ltd input when linked
    } else {
        // When unlinking, enable the Ltd input again
        ltdExpensesInput.disabled = false;
    }
    handleInputChange(); // Update calculations
}

// Helper function to convert monthly value to annual and vice versa
function monthlyToAnnual(value) {
    return value * 12;
}

function annualToMonthly(value) {
    return value / 12;
}

// Handle increment/decrement button clicks
document.querySelectorAll('.control-btn').forEach(button => {
    button.addEventListener('click', function() {
        const targetId = this.getAttribute('data-target');
        const amount = parseInt(this.getAttribute('data-amount'));
        const targetInput = document.getElementById(targetId);
        
        // Determine if we're incrementing or decrementing
        const isIncrement = this.classList.contains('increment');
        
        // Get current value
        let currentValue = parseFloat(targetInput.value) || 0;
        
        // Calculate new value (increment or decrement)
        let newValue = isIncrement ? currentValue + amount : currentValue - amount;
        
        // Ensure value doesn't go below 0
        newValue = Math.max(0, newValue);
        
        // Update the target input value
        targetInput.value = newValue;
        
        // Get the linked field selector
        const linkSelectId = `${targetId}-link`;
        const linkSelect = document.getElementById(linkSelectId);
        
        if (linkSelect && linkSelect.value !== 'none') {
            // Get the linked field and update it with the inverse change
            const linkedField = document.getElementById(linkSelect.value);
            
            if (linkedField) {
                let linkedCurrentValue = parseFloat(linkedField.value) || 0;
                
                // For monthly expenses to annual expenses, convert monthly change to annual
                let changeAmount = amount;
                if (targetId === 'monthly-expenses' && linkedField.id.includes('expenses')) {
                    changeAmount = monthlyToAnnual(amount);
                } else if (linkedField.id === 'monthly-expenses' && targetId.includes('expenses')) {
                    changeAmount = annualToMonthly(amount);
                }
                
                // Apply inverse change to the linked field (addition becomes subtraction and vice versa)
                let newLinkedValue = isIncrement 
                    ? linkedCurrentValue - changeAmount 
                    : linkedCurrentValue + changeAmount;
                    
                // Ensure linked value doesn't go below zero
                newLinkedValue = Math.max(0, newLinkedValue);
                
                // Special handling for "both-expenses" option
                if (linkSelect.value === 'both-expenses') {
                    // Update both business expense fields
                    stExpensesInput.value = Math.max(0, parseFloat(stExpensesInput.value) + (isIncrement ? changeAmount : -changeAmount));
                    if (!linkExpensesCheckbox.checked) {
                        ltdExpensesInput.value = Math.max(0, parseFloat(ltdExpensesInput.value) + (isIncrement ? changeAmount : -changeAmount));
                    }
                } else {
                    // Normal single field update
                    linkedField.value = newLinkedValue;
                }
            }
        }
        
        // If this change affects the ST expenses and they're linked to Ltd expenses
        if (targetId === 'st-expenses' && linkExpensesCheckbox.checked) {
            ltdExpensesInput.value = targetInput.value;
        }
        
        // Trigger input change to recalculate
        handleInputChange();
    });
});

// When Sole Trader expenses change and linking is enabled, update Ltd expenses
stExpensesInput.addEventListener('input', function() {
    if (linkExpensesCheckbox.checked) {
        ltdExpensesInput.value = this.value;
    }
    handleInputChange();
});

// Toggle linking when checkbox is clicked
linkExpensesCheckbox.addEventListener('change', handleExpensesLinking);

// --- Event Listeners ---
// Recalculate when any relevant input value changes
grossIncomeInput.addEventListener('input', handleInputChange);
monthlyExpensesInput.addEventListener('input', handleInputChange);
employedPensionPctInput.addEventListener('input', handleInputChange);
employedBikInput.addEventListener('input', handleInputChange);
stPensionPctInput.addEventListener('input', handleInputChange);
ltdSalaryInput.addEventListener('input', handleInputChange);
ltdExpensesInput.addEventListener('input', handleInputChange);
ltdEmployerPensionInput.addEventListener('input', handleInputChange);
ltdBikInput.addEventListener('input', handleInputChange);
ltdDividendsInput.addEventListener('input', handleInputChange);


// --- Initial Calculation ---
// Run calculations when the page loads with the default values
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the expense linking
    handleExpensesLinking();
    
    // Initialize calculations
    handleInputChange();
});
