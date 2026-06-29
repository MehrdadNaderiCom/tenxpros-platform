/** Pure email helpers, dependency-free so they are unit-testable in isolation. */

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  // Deliberately permissive but blocks the obvious bad input.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
