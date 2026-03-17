import type { Insurer } from "@/types";

/**
 * Normalizes insurer name for case-insensitive comparison.
 */
export function normalizeInsurerName(value: string | undefined): string {
  return (value || "").trim().toLowerCase();
}

/**
 * Checks if policy.insurer matches insurer (case-insensitive).
 */
export function insurerMatchesPolicy(
  insurerName: string,
  policyInsurer: string | undefined
): boolean {
  if (!policyInsurer?.trim()) return false;
  return normalizeInsurerName(insurerName) === normalizeInsurerName(policyInsurer);
}

/**
 * Returns canonical insurer display from policy.insurer.
 * When insurers list exists, finds matching insurer (case-insensitive) and returns its name.
 * Otherwise returns the raw value.
 */
export function getInsurerDisplay(
  value: string | undefined,
  insurers: Insurer[]
): string {
  if (!value?.trim()) return "-";
  const trimmed = value.trim();
  const match = insurers.find((i) =>
    insurerMatchesPolicy(i.name, trimmed)
  );
  return match ? match.name : trimmed;
}
