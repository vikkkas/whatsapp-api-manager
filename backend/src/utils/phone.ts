/**
 * Normalize phone number to E.164 format (+[country code][number])
 * This ensures consistent phone number storage and prevents duplicates
 * 
 * Examples:
 * - "8160283098" -> "+918160283098" (assumes India if no country code)
 * - "+918160283098" -> "+918160283098"
 * - "918160283098" -> "+918160283098"
 * - "00918160283098" -> "+918160283098"
 */
export function normalizePhoneNumber(input: string | null | undefined): string {
  if (!input) return '';
  
  // Remove all whitespace and non-digit characters except +
  let phone = input.trim().replace(/[^\d+]/g, '');
  
  if (!phone) return '';
  
  // If already starts with +, just clean up digits
  if (phone.startsWith('+')) {
    const digits = phone.slice(1).replace(/\D/g, '');
    return digits ? `+${digits}` : '';
  }
  
  // Remove leading zeros (international prefix like 00)
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }
  
  // If number doesn't start with country code, assume India (+91)
  // Indian mobile numbers are 10 digits starting with 6-9
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    digits = '91' + digits;
  }
  
  return digits ? `+${digits}` : '';
}

/**
 * Check if two phone numbers are the same after normalization
 */
export function isSamePhoneNumber(phone1: string | null | undefined, phone2: string | null | undefined): boolean {
  const normalized1 = normalizePhoneNumber(phone1);
  const normalized2 = normalizePhoneNumber(phone2);
  return normalized1 !== '' && normalized1 === normalized2;
}

