/** Normalise un numéro béninois saisi librement vers +229XXXXXXXXXX. */
export function normalizeBeninPhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('229')) return `+${digits}`;
  return `+229${digits}`;
}
