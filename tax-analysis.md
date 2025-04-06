# UK Income Visualiser - Tax Logic Analysis

## Overview
This document analyzes the tax calculation logic used in the UK Income Visualiser application, identifying potential discrepancies with UK tax regulations for the 2024/25 tax year.

## Income Tax Calculation
Current implementation in `calculateIncomeTax()` function:

```javascript
// Taper Personal Allowance for high earners
if (income > config.paTaperThreshold) {
    const reduction = Math.floor((income - config.paTaperThreshold) / 2);
    personalAllowance = Math.max(0, config.personalAllowance - reduction);
}
```

**Issues:**
- Using `Math.floor()` in the PA taper could slightly underestimate the reduction in some edge cases
- Should consider rounding to the nearest pound instead of flooring

## Corporation Tax Implementation
Current implementation:

```javascript
// Corporation Tax Calculation (Simplified Rate)
let corporationTax = 0;
if (profitForCT > 0) {
    const rate = profitForCT <= config.ctSmallProfitThreshold ? 
                  config.ctSmallProfitRate : config.corporationTaxRate;
    corporationTax = profitForCT * rate;
}
```

**Major Discrepancy:**
- The application uses a binary approach (19% or 25%) rather than the proper marginal relief system
- For profits between £50,000 and £250,000, a gradual taper should be applied
- Correct calculation should use the Marginal Relief formula:
  ```
  Marginal Relief = (F × (U - A) × I) ÷ A
  Where:
  F = 3/200
  U = £250,000
  A = profit
  I = taxable profit
  ```

## Limited Company Director Calculations
Current implementation:

```javascript
// Taper PA based on *total* income (salary + BiK + actual dividends)
let personalAllowance = config.personalAllowance;
if (totalIncomeForPersonalTax > config.paTaperThreshold) {
    const reduction = Math.floor((totalPersonalIncome - config.paTaperThreshold) / 2);
    personalAllowance = Math.max(0, config.personalAllowance - reduction);
}
```

**Critical Bug:**
- Variable name error: `totalPersonalIncome` should be `totalIncomeForPersonalTax`
- This will cause incorrect calculations for directors with income above £100,000

## Dividend Calculation
Current implementation:

```javascript
// Profit available for dividends (after CT)
const profitAvailableForDividends = Math.max(0, profitForCT - corporationTax);

// Validate and cap requested dividends
const actualDividends = Math.min(requestedDividends, profitAvailableForDividends);
```

**Simplification Issue:**
- Assumes dividends can only be paid from current year profits
- Doesn't account for retained earnings from previous years
- Real companies often have accumulated profits available for distribution

## National Insurance Contributions
Self-employed NI implementation:

```javascript
let class2NI = 0; // Effectively zero cost if profit >= LPL for 24/25
// Class 4 NI calculations...
```

**Accurate but needs clarification:**
- Correctly implements 2024/25 changes where Class 2 NICs were abolished
- Class 4 rates correctly set at 6% (between LPL and UPL) and 2% (above UPL)
- Should include note that Class 2 still provides benefit entitlement credits despite £0 cost

## Missing Tax Elements

### Student Loan Repayments
- Application doesn't account for student loan repayments
- Plan 1, 2, 4, and Postgraduate Loans have different thresholds and rates
- Can significantly reduce take-home pay for many workers

### Scottish Income Tax
- Model assumes England/NI/Wales rates
- Scottish taxpayers face different income tax bands and rates
- No option to switch to Scottish calculations

### Employment Allowance
- No consideration for the Employment Allowance (up to £5,000 off employer's NI bill)
- Relevant for small limited companies with multiple employees

## Conclusion
While the UK Income Visualiser provides a robust framework for comparing different employment structures, these identified discrepancies should be addressed to improve accuracy, particularly:

1. Fix the variable name bug in the Ltd Company director PA taper calculation
2. Implement proper marginal relief for Corporation Tax between £50,000-£250,000
3. Add options for Scottish income tax rates and student loan repayments
4. Consider allowing for retained earnings in the Ltd Company dividend calculations

The tool remains valuable for comparative analysis but should include appropriate disclaimers about these simplifications.
