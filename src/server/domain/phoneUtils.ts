/**
 * Utility functions for strict phone number normalization, indexing, and display formatting.
 */

/**
 * Normalizes any raw phone input to clean digits for consistent B-tree indexing and lightning-fast search.
 * e.g. "(555) 234-5678" -> "5552345678"
 * "+1-800-555-0199" -> "18005550199"
 */
export function normalizePhoneNumber(raw: string): string {
  if (!raw) return '';
  return raw.replace(/[^0-9]/g, '');
}

/**
 * Formats a clean digit string into a standard readable counter format.
 */
export function formatPhoneNumber(normalized: string): string {
  if (!normalized) return '';
  const digits = normalizePhoneNumber(normalized);

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  } else if (digits.length > 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return digits;
}

/**
 * Validates whether a phone number contains at least reasonable digits (min 7, max 15 digits).
 */
export function isValidPhoneNumber(raw: string): boolean {
  const digits = normalizePhoneNumber(raw);
  return digits.length >= 7 && digits.length <= 15;
}
