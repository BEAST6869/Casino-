"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkCooldown = checkCooldown;
exports.setCooldown = setCooldown;
exports.clearCooldown = clearCooldown;
exports.getCooldownExpiry = getCooldownExpiry;
// src/utils/cooldowns.ts
const cooldowns = new Map();
/**
 * Check and set a cooldown.
 * key: unique key for the cooldown (e.g. "income:guild:user:command")
 * seconds: cooldown length in seconds
 * Returns: remaining seconds (0 if not on cooldown)
 */
function checkCooldown(key, seconds) {
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
function setCooldown(key, secondsFromNow) {
    cooldowns.set(key, Date.now() + secondsFromNow * 1000);
}
/**
 * Clear a cooldown (for testing/admin)
 */
function clearCooldown(key) {
    cooldowns.delete(key);
}
/**
 * Get the absolute expiry timestamp (ms) for a key, or null if none/expired.
 */
function getCooldownExpiry(key) {
    const expiresAt = cooldowns.get(key);
    if (!expiresAt || expiresAt <= Date.now())
        return null;
    return expiresAt;
}
//# sourceMappingURL=cooldown.js.map