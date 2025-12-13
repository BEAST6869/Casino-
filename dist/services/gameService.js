"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.placeBetWithTransaction = placeBetWithTransaction;
exports.placeBetFallback = placeBetFallback;
const prisma_1 = __importDefault(require("../utils/prisma"));
const guildConfigService_1 = require("./guildConfigService");
async function placeBetWithTransaction(userId, walletId, gameId, amount, choice, didWin, payout, guildId) {
    const config = await (0, guildConfigService_1.getGuildConfig)(guildId);
    const currentWallet = await prisma_1.default.wallet.findUnique({ where: { id: walletId } });
    if (!currentWallet)
        throw new Error("Wallet not found");
    let actualPayout = payout;
    if (didWin && config.walletLimit) {
        const projectedBalance = currentWallet.balance - amount + payout;
        if (projectedBalance > config.walletLimit) {
            const allowedPayout = config.walletLimit - (currentWallet.balance - amount);
            actualPayout = Math.max(0, allowedPayout);
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
async function placeBetFallback(walletId, userId, gameId, amount, choice, didWin, payout, guildId) {
    const config = await (0, guildConfigService_1.getGuildConfig)(guildId);
    const currentWallet = await prisma_1.default.wallet.findUnique({ where: { id: walletId } });
    if (!currentWallet)
        throw new Error("Wallet not found");
    let actualPayout = payout;
    if (didWin && config.walletLimit) {
        const projected = currentWallet.balance - amount + payout;
        if (projected > config.walletLimit) {
            actualPayout = Math.max(0, config.walletLimit - (currentWallet.balance - amount));
        }
    }
    const res = await prisma_1.default.wallet.updateMany({
        where: { id: walletId, balance: { gte: amount } },
        data: { balance: { decrement: amount } }
    });
    if (res.count === 0)
        throw new Error("Insufficient funds during betting stage");
    await prisma_1.default.bet.create({
        data: { userId, gameId, amount, choice, result: didWin ? "win" : "lose", payout: actualPayout }
    });
    await prisma_1.default.transaction.create({
        data: {
            walletId,
            amount: didWin ? (actualPayout - amount) : -amount,
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