/**
 * Phone number formatting utilities
 */

/**
 * Format phone number for display in Indian format
 * @param phone - Raw phone number (e.g., "918160283098")
 * @returns Formatted phone number (e.g., "+91 81602 83098")
 */
export function formatPhoneNumberDisplay(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Handle Indian numbers (12 digits starting with 91)
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    const countryCode = cleaned.slice(0, 2);
    const number = cleaned.slice(2);
    // Format as +91 XXXXX XXXXX
    return `+${countryCode} ${number.slice(0, 5)} ${number.slice(5)}`;
  }
  
  // Handle Indian numbers (10 digits, add country code)
  if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) {
    // Format as +91 XXXXX XXXXX
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  
  // Handle US numbers (11 digits starting with 1)
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    const countryCode = cleaned.slice(0, 1);
    const areaCode = cleaned.slice(1, 4);
    const number = cleaned.slice(4);
    // Format as +1 (XXX) XXX-XXXX
    return `+${countryCode} (${areaCode}) ${number.slice(0, 3)}-${number.slice(3)}`;
  }
  
  // Handle US numbers (10 digits, add country code)
  if (cleaned.length === 10 && /^[2-9]/.test(cleaned)) {
    const areaCode = cleaned.slice(0, 3);
    const number = cleaned.slice(3);
    // Format as +1 (XXX) XXX-XXXX
    return `+1 (${areaCode}) ${number.slice(0, 3)}-${number.slice(3)}`;
  }
  
  // For other international numbers, just add + and space after country code
  if (cleaned.length >= 10) {
    return `+${cleaned}`;
  }
  
  // Return as-is if we can't format it
  return phone;
}

/**
 * Get country flag emoji based on phone number
 * @param phone - Phone number
 * @returns Flag emoji
 */
export function getCountryFlag(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('91') || (cleaned.length === 10 && /^[6-9]/.test(cleaned))) {
    return '🇮🇳'; // India
  }
  
  if (cleaned.startsWith('1') || (cleaned.length === 10 && /^[2-9]/.test(cleaned))) {
    return '🇺🇸'; // USA
  }
  
  return '🌍'; // World/International
}

/**
 * Format phone number for API requests (normalize to international format)
 * @param phone - Input phone number
 * @returns Normalized phone number for API
 */
export function normalizePhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  // Indian numbers
  if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) {
    return `91${cleaned}`;
  }
  
  // US numbers
  if (cleaned.length === 10 && /^[2-9]/.test(cleaned)) {
    return `1${cleaned}`;
  }
  
  // Already has country code
  if (cleaned.length > 10) {
    return cleaned;
  }
  
  return cleaned;
}