"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEarnedSums = getEarnedSums;
// src/utils/balanceUtils.ts
const prisma_1 = __importDefault(require("./prisma"));
/**
 * Compute earned-only sums (useful for reporting).
 * Not used for gifting check because gifting is relaxed.
 */
async function getEarnedSums(walletId) {
    const earnedAgg = await prisma_1.default.transaction.aggregate({
        where: { walletId, isEarned: true },
        _sum: { amount: true }
    });
    const earnedSum = earnedAgg._sum.amount ?? 0;
    const outAgg = await prisma_1.default.transaction.aggregate({
        where: { walletId, type: "transfer_sent" },
        _sum: { amount: true }
    });
    const transferredOut = outAgg._sum.amount ?? 0;
    const transferableEarned = Math.max(0, earnedSum - transferredOut);
    return { earnedSum, transferredOut, transferableEarned };
}
//# sourceMappingURL=balanceUtils.js.map