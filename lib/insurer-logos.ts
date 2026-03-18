/**
 * Maps insurer names (normalized) to Clearbit logo domain.
 * Clearbit Logo API: https://logo.clearbit.com/{domain}
 * Fallback to Building2 icon when logo not found.
 */

const INSURER_DOMAINS: Record<string, string> = {
  "porto seguro": "portoseguro.com.br",
  "portoseguro": "portoseguro.com.br",
  "sul america": "sulamerica.com.br",
  "sulamerica": "sulamerica.com.br",
  "sul américa": "sulamerica.com.br",
  "bradesco seguros": "bradescoseguros.com.br",
  "bradescoseguros": "bradescoseguros.com.br",
  "bradesco": "bradescoseguros.com.br",
  "itaú seguros": "itau.com.br",
  "itau seguros": "itau.com.br",
  "itau": "itau.com.br",
  "itaú": "itau.com.br",
  "liberty seguros": "libertyseguros.com.br",
  "liberty": "libertyseguros.com.br",
  "azul seguros": "azulseguros.com.br",
  "azul": "azulseguros.com.br",
  "tokio marine": "tokiomarine.com.br",
  "tokiomarine": "tokiomarine.com.br",
  "tokio": "tokiomarine.com.br",
  "zurich": "zurich.com.br",
  "allianz": "allianz.com.br",
  "mapfre": "mapfre.com.br",
  "chubb": "chubb.com.br",
  "generali": "generali.com.br",
  "sompo": "somposeguros.com.br",
  "sompo seguros": "somposeguros.com.br",
  "hd seguros": "hdiseguros.com.br",
  "hd i seguros": "hdiseguros.com.br",
  "bmg seguros": "bmg.com.br",
  "unimed": "unimed.com.br",
  "previdência": "previdencia.com.br",
};

function normalizeForLookup(name: string): string {
  return (name || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // remove accents
}

/**
 * Returns Clearbit logo URL for insurer, or null if no mapping.
 */
export function getInsurerLogoUrl(insurerName: string | undefined): string | null {
  if (!insurerName?.trim()) return null;
  const key = normalizeForLookup(insurerName);
  // exact match
  if (INSURER_DOMAINS[key]) {
    return `https://logo.clearbit.com/${INSURER_DOMAINS[key]}`;
  }
  // partial match (insurer name contains known key)
  for (const [knownKey, domain] of Object.entries(INSURER_DOMAINS)) {
    if (key.includes(knownKey)) return `https://logo.clearbit.com/${domain}`;
  }
  return null;
}
