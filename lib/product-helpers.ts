import type { Product } from "@/types";

/**
 * Resolves product display from stored value.
 * Old entries may store only the code ("0", "4"); new ones store "0 - AUTOMÓVEL".
 * Maps code to "code - name" when products list is available.
 */
export function getProductDisplay(value: string | undefined, products: Product[]): string {
  if (!value?.trim()) return "-";
  const trimmed = value.trim();
  const num = parseInt(trimmed, 10);
  if (!isNaN(num) && products.some((p) => p.code === num)) {
    const p = products.find((p) => p.code === num)!;
    return `${p.code} - ${p.name}`;
  }
  return trimmed; // Already "code - name" or legacy text
}

/**
 * Extracts product code from policy.product string.
 * Supports "0", "0 - AUTOMÓVEL", or legacy text.
 */
export function extractProductCodeFromPolicy(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const part = value.includes(" - ") ? value.split(" - ")[0]?.trim() : value.trim();
  const num = parseInt(part || "", 10);
  return isNaN(num) ? null : num;
}

/**
 * Resolves product code from value, including plain names via products list.
 * "Frota" with products [{code:7,name:"FROTA"}] returns 7.
 */
export function resolveProductCode(value: string | undefined, products: Product[]): number | null {
  const code = extractProductCodeFromPolicy(value);
  if (code !== null) return code;
  if (!value?.trim() || !products?.length) return null;
  const nameLower = value.trim().toLowerCase();
  const match = products.find((p) => p.name.toLowerCase() === nameLower);
  return match ? match.code : null;
}
