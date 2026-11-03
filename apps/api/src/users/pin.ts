/** ACC-09 : PIN de 4 à 6 chiffres, refus des codes trop faciles à deviner. */
export function pinWeakness(pin: string): string | null {
  if (!/^\d{4,6}$/.test(pin)) return 'Le code PIN contient 4 à 6 chiffres';
  if (/^(\d)\1+$/.test(pin)) return 'Le code PIN ne peut pas répéter le même chiffre';
  const digits = pin.split('').map(Number);
  const ascending = digits.every((d, i) => i === 0 || d === (digits[i - 1] + 1) % 10);
  const descending = digits.every((d, i) => i === 0 || d === (digits[i - 1] + 9) % 10);
  if (ascending || descending) return 'Le code PIN ne peut pas être une suite de chiffres';
  return null;
}
