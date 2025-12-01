"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.placeBetWithTransaction = placeBetWithTransaction;
exports.placeBetFallback = placeBetFallback;
// src/services/gameService.ts
const prisma_1 = __importDefault(require("../utils/prisma"));
/**
 * Create a bet + transactions + update wallet using a transaction.
 * gameId should exist in GameSession.
 */
async function placeBetWithTransaction(userId, walletId, gameId, amount, choice, didWin, payout) {
    const netChange = payout - amount;
    await prisma_1.default.$transaction(async (tx) => {
        await tx.bet.create({
            data: {
                userId,
                gameId,
                amount,
                choice,
                result: didWin ? "win" : "lose",
                payout
            }
        });
        await tx.transaction.create({
            data: {
                walletId,
                amount: netChange,
                type: didWin ? "payout" : "bet",
                meta: { choice, payout, didWin }
            }
        });
        await tx.wallet.update({
            where: { id: walletId },
            data: { balance: { increment: netChange } }
        });
    });
}
/**
 * Fallback atomic bet for single-node mongo.
 */
async function placeBetFallback(walletId, userId, gameId, amount, choice, didWin, payout) {
    // step 1: conditional decrement
    const res = await prisma_1.default.wallet.updateMany({
        where: { id: walletId, balance: { gte: amount } },
        data: { balance: { decrement: amount } }
    });
    if (res.count === 0)
        throw new Error("Insufficient funds during betting stage");
    // create bet & transaction
    await prisma_1.default.bet.create({
        data: { userId, gameId, amount, choice, result: didWin ? "win" : "lose", payout }
    });
    await prisma_1.default.transaction.create({
        data: { walletId, amount: didWin ? (payout) : -amount, type: didWin ? "payout" : "bet", meta: { choice, payout, didWin } }
    });
    if (didWin) {
        await prisma_1.default.wallet.update({ where: { id: walletId }, data: { balance: { increment: payout } } });
    }
}
//# sourceMappingURL=gameService.js.map