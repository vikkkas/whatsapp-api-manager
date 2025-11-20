export function normalizePhoneNumber(input: string | null | undefined): string {
  if (!input) return '';
  let phone = input.trim();

  if (!phone) return '';

  if (phone.startsWith('+')) {
    const digits = phone.slice(1).replace(/\D/g, '');
    return digits ? `+${digits}` : '';
  }

  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  return digits ? `+${digits}` : '';
}
