"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTransferableAmount = getTransferableAmount;
const prisma_1 = __importDefault(require("./prisma"));
/**
 * Compute transferable balance for a wallet.
 * earnedTypes - set of txn.type considered as "earned"
 */
async function getTransferableAmount(walletId) {
    // earned types
    const earnedTypes = ["income", "job", "game_win", "payout"]; // adjust as you create them
    // sum of earned transactions
    const earnedAgg = await prisma_1.default.transaction.aggregate({
        where: { walletId, type: { in: earnedTypes } },
        _sum: { amount: true }
    });
    const earnedSum = (earnedAgg._sum.amount ?? 0);
    // sum of transfer outgoing already done
    const outAgg = await prisma_1.default.transaction.aggregate({
        where: { walletId, type: "transfer_sent" },
        _sum: { amount: true }
    });
    const transferredOut = (outAgg._sum.amount ?? 0);
    // If you want to allow transfers of earned + any unlocked balance, also add wallet.balance - totalBalanceFromEarned? But simplest:
    const transferable = Math.max(0, earnedSum - transferredOut);
    return { transferable, earnedSum, transferredOut };
}
//# sourceMappingURL=balance.js.map