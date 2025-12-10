"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.placeBetWithTransaction = placeBetWithTransaction;
exports.placeBetFallback = placeBetFallback;
const prisma_1 = __importDefault(require("../utils/prisma"));
const guildConfigService_1 = require("./guildConfigService");
/**
 * Create a bet + transactions + update wallet using a transaction.
 * gameId should exist in GameSession.
 * Returns the ACTUAL payout (which might be capped by wallet limit).
 */
async function placeBetWithTransaction(userId, walletId, gameId, amount, choice, didWin, payout, guildId) {
    // 1. Get Config & Current Balance
    const config = await (0, guildConfigService_1.getGuildConfig)(guildId);
    const currentWallet = await prisma_1.default.wallet.findUnique({ where: { id: walletId } });
    if (!currentWallet)
        throw new Error("Wallet not found");
    let actualPayout = payout;
    // 2. Enforce Limit if Winning
    if (didWin && config.walletLimit) {
        const projectedBalance = currentWallet.balance - amount + payout;
        if (projectedBalance > config.walletLimit) {
            // Cap the payout so balance == limit
            // NewBalance = OldBalance - Amount + ActualPayout = Limit
            // ActualPayout = Limit - (OldBalance - Amount)
            const allowedPayout = config.walletLimit - (currentWallet.balance - amount);
            actualPayout = Math.max(0, allowedPayout); // Ensure not negative
        }
    }
    const netChange = actualPayout - amount;
    await prisma_1.default.$transaction(async (tx) => {
        await tx.bet.create({
            data: {
                userId,
                gameId,
                amount,
                choice,
                result: didWin ? "win" : "lose",
                payout: actualPayout
            }
        });
        await tx.transaction.create({
            data: {
                walletId,
                amount: netChange,
                type: didWin ? "payout" : "bet",
                meta: { choice, payout: actualPayout, originalPayout: payout, didWin }
            }
        });
        await tx.wallet.update({
            where: { id: walletId },
            data: { balance: { increment: netChange } }
        });
    });
    return actualPayout;
}
/**
 * Fallback atomic bet for single-node mongo.
 */
async function placeBetFallback(walletId, userId, gameId, amount, choice, didWin, payout, guildId) {
    // 1. Get Config & Current Balance (for limit check)
    // Note: Validation is tricky in fallback because we decrement first. 
    // We'll proceed with standard logic but cap the increment step.
    const config = await (0, guildConfigService_1.getGuildConfig)(guildId);
    // We need current balance.
    const currentWallet = await prisma_1.default.wallet.findUnique({ where: { id: walletId } });
    if (!currentWallet)
        throw new Error("Wallet not found");
    let actualPayout = payout;
    if (didWin && config.walletLimit) {
        // If we win, we decrement 'amount' then increment 'payout'.
        // Projected = Balance - Amount + Payout
        const projected = currentWallet.balance - amount + payout;
        if (projected > config.walletLimit) {
            actualPayout = Math.max(0, config.walletLimit - (currentWallet.balance - amount));
        }
    }
    // step 1: conditional decrement
    const res = await prisma_1.default.wallet.updateMany({
        where: { id: walletId, balance: { gte: amount } },
        data: { balance: { decrement: amount } }
    });
    if (res.count === 0)
        throw new Error("Insufficient funds during betting stage");
    // create bet & transaction
    await prisma_1.default.bet.create({
        data: { userId, gameId, amount, choice, result: didWin ? "win" : "lose", payout: actualPayout }
    });
    await prisma_1.default.transaction.create({
        data: {
            walletId,
            amount: didWin ? (actualPayout - amount) : -amount, // Net effect relative to start? 
            // Actually transaction usually logs the net change or the specific action?
            // Check placeBetWithTransaction: it logs netChange.
            // But here we split operations. Let's log the net change for consistency or just the payout event?
            // In Fallback we usually don't have atomic net change. 
            // Let's stick to the previous pattern: "payout" type usually implies +Value.
            // The previous code was: amount: didWin ? payout : -amount
            // So we use actualPayout.
            type: didWin ? "payout" : "bet",
            meta: { choice, payout: actualPayout, didWin }
        }
    });
    if (didWin) {
        await prisma_1.default.wallet.update({ where: { id: walletId }, data: { balance: { increment: actualPayout } } });
    }
    return actualPayout;
}
//# sourceMappingURL=gameService.js.map