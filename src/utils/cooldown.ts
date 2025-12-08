// src/utils/cooldowns.ts
const cooldowns = new Map<string, number>();

/**
 * Check and set a cooldown.
 * key: unique key for the cooldown (e.g. "income:guild:user:command")
 * seconds: cooldown length in seconds
 * Returns: remaining seconds (0 if not on cooldown)
 */
export function checkCooldown(key: string, seconds: number): number {
  const now = Date.now();
  const expiresAt = cooldowns.get(key) ?? 0;
  if (now < expiresAt) {
    return Math.ceil((expiresAt - now) / 1000);
  }
  cooldowns.set(key, now + seconds * 1000);
  return 0;
}

/**
 * Manual setter (optional) - set cooldown remaining seconds
 */
export function setCooldown(key: string, secondsFromNow: number) {
  cooldowns.set(key, Date.now() + secondsFromNow * 1000);
}

/**
 * Clear a cooldown (for testing/admin)
 */
export function clearCooldown(key: string) {
  cooldowns.delete(key);
}

/**
 * Get the absolute expiry timestamp (ms) for a key, or null if none/expired.
 */
export function getCooldownExpiry(key: string): number | null {
  const expiresAt = cooldowns.get(key);
  if (!expiresAt || expiresAt <= Date.now()) return null;
  return expiresAt;
}
