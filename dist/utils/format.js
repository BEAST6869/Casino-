"use strict";
// src/utils/format.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.fmtAmount = fmtAmount;
exports.fmtCurrency = fmtCurrency;
/** Formats a number with commas (e.g. 1,000) */
function fmtAmount(n) {
    return n.toLocaleString("en-US");
}
/** Formats a number with the guild's currency emoji (e.g. 🪙 1,000) */
function fmtCurrency(n, emoji) {
    return `${emoji} ${fmtAmount(n)}`;
}
//# sourceMappingURL=format.js.map