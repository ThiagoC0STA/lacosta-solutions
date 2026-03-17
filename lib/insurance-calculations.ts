/**
 * Insurance financial calculations for Brazil.
 * Based on Excel formulas:
 * - Prêmio Líquido = Prêmio Total / (1 + IOF_rate)
 * - IOF = Prêmio Líquido × IOF_rate
 * - Comissão 10% = Prêmio Líquido × 10%
 * - Comissão 15% = Prêmio Líquido × 15%
 */

const IOF_RATE = 0.0738; // 7.38% - Brazil auto insurance IOF

export interface FinancialBreakdown {
  iof: number;
  netPremium: number;
  commission10: number;
  commission15: number;
}

export function calculateFromPremium(premium: number): FinancialBreakdown {
  // Prêmio Líquido = Prêmio Total / (1 + IOF_rate)
  const netPremium = Math.round((premium / (1 + IOF_RATE)) * 100) / 100;
  // IOF = Prêmio Líquido × IOF_rate
  const iof = Math.round(netPremium * IOF_RATE * 100) / 100;
  const commission10 = Math.round(netPremium * 0.1 * 100) / 100;
  const commission15 = Math.round(netPremium * 0.15 * 100) / 100;
  return { iof, netPremium, commission10, commission15 };
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
  otherNotes?: string;
}

/** Parse policy notes to extract plate, IOF, netPremium, commission. */
export function parseNotesFromPolicy(notes: string | undefined): ParsedNotes {
  const result: ParsedNotes = {};
  if (!notes) return result;

  const plateMatch = notes.match(/Placa:\s*(\w+)/i);
  if (plateMatch) result.plate = plateMatch[1].trim();

  const iofMatch = notes.match(/IOF:\s*R\$\s*([\d.,]+)/i);
  if (iofMatch) {
    const val = parseFloat(iofMatch[1].replace(/\./g, "").replace(",", "."));
    if (!isNaN(val)) result.iof = val;
  }

  const netMatch = notes.match(/Prêmio\s+Líquido:\s*R\$\s*([\d.,]+)/i);
  if (netMatch) {
    const val = parseFloat(netMatch[1].replace(/\./g, "").replace(",", "."));
    if (!isNaN(val)) result.netPremium = val;
  }

  const commMatch = notes.match(/Comissão:\s*R\$\s*([\d.,]+)/i);
  if (commMatch) {
    const val = parseFloat(commMatch[1].replace(/\./g, "").replace(",", "."));
    if (!isNaN(val)) result.commission = val;
  }

  return result;
}

/** Build notes string from premium (recalculates IOF, netPremium, commissions) and optional plate. */
export function buildNotesFromFinancial(premium: number, plate?: string): string {
  const { iof, netPremium, commission10, commission15 } = calculateFromPremium(premium);
  const parts: string[] = [];
  if (plate) parts.push(`Placa: ${plate}`);
  parts.push(`IOF: R$ ${formatCurrencyBR(iof)}`);
  parts.push(`Prêmio Líquido: R$ ${formatCurrencyBR(netPremium)}`);
  parts.push(`Comissão 10%: R$ ${formatCurrencyBR(commission10)}`);
  parts.push(`Comissão 15%: R$ ${formatCurrencyBR(commission15)}`);
  return parts.join(" | ");
}
