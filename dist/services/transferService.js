"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transferAnyFunds = transferAnyFunds;
const prisma_1 = __importDefault(require("../utils/prisma"));
async function transferAnyFunds(fromWalletId, toDiscordId, amount, fromDiscordId, guildId) {
    if (amount <= 0)
        throw new Error("Invalid amount.");
    const fromWallet = await prisma_1.default.wallet.findUnique({ where: { id: fromWalletId } });
    if (!fromWallet)
        throw new Error("Sender wallet not found.");
    if (fromWallet.balance < amount)
        throw new Error("Insufficient funds.");
    if (!guildId)
        throw new Error("Guild ID required for transfer.");
    const recipient = await prisma_1.default.user.upsert({
        where: { discordId_guildId: { discordId: toDiscordId, guildId } },
        update: {},
        create: {
            discordId: toDiscordId,
            guildId,
            username: "Unknown",
            wallet: { create: { balance: 0 } }
        },
        include: { wallet: true }
    });
    const toWalletId = recipient.wallet.id;
    await prisma_1.default.$transaction([
        prisma_1.default.transaction.create({ data: { walletId: fromWalletId, amount: -amount, type: "transfer_sent", meta: { to: toDiscordId }, isEarned: false } }),
        prisma_1.default.wallet.update({ where: { id: fromWalletId }, data: { balance: { decrement: amount } } }),
        prisma_1.default.transaction.create({ data: { walletId: toWalletId, amount, type: "transfer_recv", meta: { from: fromDiscordId }, isEarned: false } }),
        prisma_1.default.wallet.update({ where: { id: toWalletId }, data: { balance: { increment: amount } } }),
        prisma_1.default.audit.create({ data: { guildId: guildId ?? undefined, userId: fromDiscordId, type: "transfer", meta: { to: toDiscordId, amount } } })
    ]);
    return true;
}
//# sourceMappingURL=transferService.js.map