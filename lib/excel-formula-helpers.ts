/**
 * Extracts commission rate from Excel formula strings.
 * Supports formats: =O11*25%, =O11*0.25, =O11*25/100
 */

export function extractCommissionRateFromFormula(formula: string): number | null {
  if (!formula || typeof formula !== "string") return null;
  const f = formula.trim();
  // Match *25% or *22.5% or *22,5%
  const percentMatch = f.match(/\*(\d+(?:[.,]\d+)?)\s*%/);
  if (percentMatch) {
    const val = parseFloat(percentMatch[1].replace(",", "."));
    return !isNaN(val) ? val : null;
  }
  // Match *0.25 or *0,25 (decimal form = 25%)
  const decimalMatch = f.match(/\*0?[.,](\d+)/);
  if (decimalMatch) {
    const decimals = decimalMatch[1];
    const val = parseFloat("0." + decimals);
    return !isNaN(val) ? Math.round(val * 1000) / 10 : null;
  }
  // Match *25/100
  const fracMatch = f.match(/\*(\d+)\s*\/\s*100/);
  if (fracMatch) {
    const val = parseFloat(fracMatch[1]);
    return !isNaN(val) ? val : null;
  }
  return null;
}
