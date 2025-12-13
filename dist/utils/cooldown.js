"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkCooldown = checkCooldown;
exports.setCooldown = setCooldown;
exports.clearCooldown = clearCooldown;
exports.getCooldownExpiry = getCooldownExpiry;
const cooldowns = new Map();
function checkCooldown(key, seconds) {
    const now = Date.now();
    const expiresAt = cooldowns.get(key) ?? 0;
    if (now < expiresAt) {
        return Math.ceil((expiresAt - now) / 1000);
    }
    cooldowns.set(key, now + seconds * 1000);
    return 0;
}
function setCooldown(key, secondsFromNow) {
    cooldowns.set(key, Date.now() + secondsFromNow * 1000);
}
function clearCooldown(key) {
    cooldowns.delete(key);
}
function getCooldownExpiry(key) {
    const expiresAt = cooldowns.get(key);
    if (!expiresAt || expiresAt <= Date.now())
        return null;
    return expiresAt;
}
//# sourceMappingURL=cooldown.js.map