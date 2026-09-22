// String formatting and auto-capitalization utilities for form modules

/**
 * Capitalizes the first letter of each word in a string (Title Case).
 * E.g. "mario rossi" -> "Mario Rossi"
 * "via marina 12" -> "Via Marina 12"
 * "massa" -> "Massa"
 * "carta d'identità" -> "Carta D'Identità"
 */
export function capitalizeWords(str?: string): string {
  if (!str) return "";
  
  // Words to keep lowercase unless at start
  const minorWords = new Set(["di", "dei", "del", "della", "delle", "degli", "da", "in", "su", "per", "con", "tra", "fra", "e", "o"]);

  return str
    .split(/(\s+|['\-])/)
    .map((token, index, arr) => {
      if (!token.trim() || token === "'" || token === "-") return token;
      
      const lower = token.toLowerCase();
      
      // Keep minor words lowercase unless first token
      if (index > 0 && minorWords.has(lower) && index < arr.length - 1) {
        return lower;
      }
      
      // Standard title casing
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");
}

/**
 * Capitalizes only the first letter of a sentence or paragraph.
 * E.g. "cane sprovvisto di microchip." -> "Cane sprovvisto di microchip."
 */
export function capitalizeSentence(str?: string): string {
  if (!str) return "";
  const trimmed = str.trimStart();
  if (!trimmed) return "";
  return str.slice(0, str.length - trimmed.length) + trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * Normalizes Italian tax codes (Codice Fiscale) or License Plates or Province codes to uppercase.
 */
export function toUpperCode(str?: string): string {
  if (!str) return "";
  return str.toUpperCase().trim();
}

/**
 * Normalizes document type or standard dropdown options.
 */
export function capitalizeDocType(str?: string): string {
  if (!str) return "";
  return capitalizeWords(str);
}
