/**
 * Insurance financial calculations for Brazil.
 * Formulas:
 * - Prêmio Líquido = Prêmio Total / (1 + IOF_rate)
 * - IOF = Prêmio Líquido × IOF_rate
 * - Comissão = Prêmio Líquido × (rate / 100) — rate varies per policy (10%, 15%, 20%, 22%, etc.)
 */

const IOF_RATE = 0.0738; // 7.38% - Brazil auto insurance IOF

export interface FinancialBreakdown {
  iof: number;
  netPremium: number;
  commission: number;
  commissionRate: number;
}

/** Calculate commission from net premium and rate (e.g. 22 for 22%). */
export function commissionFromRate(netPremium: number, ratePercent: number): number {
  return Math.round((netPremium * (ratePercent / 100)) * 100) / 100;
}

/** Infer commission rate from value and net premium (rate = value / netPremium * 100). */
export function rateFromCommission(value: number, netPremium: number): number {
  if (netPremium <= 0) return 0;
  return Math.round((value / netPremium) * 1000) / 10; // 1 decimal
}

export function calculateFromPremium(premium: number, commissionRatePercent?: number): FinancialBreakdown {
  const netPremium = Math.round((premium / (1 + IOF_RATE)) * 100) / 100;
  const iof = Math.round(netPremium * IOF_RATE * 100) / 100;
  const rate = commissionRatePercent ?? 15; // default 15%
  const commission = commissionFromRate(netPremium, rate);
  return { iof, netPremium, commission, commissionRate: rate };
}

export function formatCurrencyBR(value: number): string {
  return value.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Format for display: R$ 1.234,56 */
export function formatCurrency(value: number): string {
  return `R$ ${formatCurrencyBR(value)}`;
}

/** Parse BRL input (digits only, last 2 = cents) to number. "123456" -> 1234.56 */
export function parseBRLToNumber(str: string): number {
  const digits = str.replace(/\D/g, "");
  if (digits === "") return 0;
  return parseInt(digits, 10) / 100;
}

/** Format number for currency input display: R$ 1.234,56 */
export function formatBRLForInput(value: number): string {
  if (value === 0) return "";
  return `R$ ${formatCurrencyBR(value)}`;
}

export interface ParsedNotes {
  plate?: string;
  iof?: number;
  netPremium?: number;
  commission?: number;
  commissionRate?: number;
  otherNotes?: string;
}

function parseMoney(str: string): number {
  const val = parseFloat(str.replace(/\./g, "").replace(",", "."));
  return isNaN(val) ? 0 : val;
}

/** Parse policy notes to extract plate, IOF, netPremium, commission, commissionRate. */
export function parseNotesFromPolicy(notes: string | undefined): ParsedNotes {
  const result: ParsedNotes = {};
  if (!notes) return result;

  const plateMatch = notes.match(/Placa:\s*([A-Za-z0-9-]+)/i);
  if (plateMatch) result.plate = plateMatch[1].trim();

  const iofMatch = notes.match(/IOF:\s*R\$\s*([\d.,]+)/i);
  if (iofMatch) result.iof = parseMoney(iofMatch[1]);

  const netMatch = notes.match(/Prêmio\s+Líquido:\s*R\$\s*([\d.,]+)/i);
  if (netMatch) result.netPremium = parseMoney(netMatch[1]);

  // New format: Comissão 22%: R$ 374,63
  const commRateMatch = notes.match(/Comissão\s+(\d+(?:[.,]\d+)?)%\s*:\s*R\$\s*([\d.,]+)/i);
  if (commRateMatch) {
    result.commissionRate = parseFloat(commRateMatch[1].replace(",", ".")) || 0;
    result.commission = parseMoney(commRateMatch[2]);
  } else {
    // Legacy: Comissão: R$ 374,63 (Excel import)
    const commMatch = notes.match(/Comissão\s*:\s*R\$\s*([\d.,]+)/i);
    if (commMatch) {
      result.commission = parseMoney(commMatch[1]);
    }
  }

  return result;
}

/** Get commission value for reports/totals. Supports new and legacy formats. */
export function getCommissionFromNotes(
  notes: string | undefined,
  premium?: number
): number {
  const parsed = parseNotesFromPolicy(notes);
  if (parsed.commission != null && parsed.commission > 0) return parsed.commission;
  if (premium && premium > 0) {
    const { commission } = calculateFromPremium(premium);
    return commission;
  }
  return 0;
}

/** Build notes with IOF, Prêmio Líquido, Comissão (value + rate). */
export function buildNotesWithCommission(
  premium: number,
  plate?: string,
  commissionValue?: number,
  commissionRatePercent?: number
): string {
  const { iof, netPremium } = calculateFromPremium(premium);
  const parts: string[] = [];
  if (plate) parts.push(`Placa: ${plate}`);
  parts.push(`IOF: R$ ${formatCurrencyBR(iof)}`);
  parts.push(`Prêmio Líquido: R$ ${formatCurrencyBR(netPremium)}`);

  let commission = commissionValue;
  let rate = commissionRatePercent;
  if (commission != null && rate != null) {
    // Use both as provided
  } else if (rate != null) {
    commission = commissionFromRate(netPremium, rate);
  } else if (commission != null && netPremium > 0) {
    rate = rateFromCommission(commission, netPremium);
  } else {
    rate = 15;
    commission = commissionFromRate(netPremium, rate);
  }
  parts.push(`Comissão ${rate}%: R$ ${formatCurrencyBR(commission ?? 0)}`);

  return parts.join(" | ");
}

/** @deprecated Use buildNotesWithCommission. Kept for backwards compat. */
export function buildNotesFromFinancial(premium: number, plate?: string): string {
  return buildNotesWithCommission(premium, plate);
}
