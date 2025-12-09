"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureBankForUser = ensureBankForUser;
exports.depositToBank = depositToBank;
exports.withdrawFromBank = withdrawFromBank;
exports.getBankByUserId = getBankByUserId;
exports.removeMoneyFromBank = removeMoneyFromBank;
// src/services/bankService.ts
const prisma_1 = __importDefault(require("../utils/prisma"));
/** ensure bank row by user.id (prisma User.id) OR discordId */
async function ensureBankForUser(userIdOrDiscordId) {
    let userId = userIdOrDiscordId;
    // Check if it's a Discord ID look-alike (digits) or assume it is if not ObjectId format
    // Better: Try to find user by ID first. If not found, try Discord ID.
    // Actually, since we have mixed usage, let's just do a robust lookup.
    if (!userIdOrDiscordId.match(/^[0-9a-fA-F]{24}$/)) {
        // Not an ObjectId, assume Discord ID
        const user = await prisma_1.default.user.findUnique({ where: { discordId: userIdOrDiscordId } });
        if (!user)
            throw new Error("User not found for bank creation.");
        userId = user.id;
    }
    const bank = await prisma_1.default.bank.findUnique({ where: { userId } });
    if (bank)
        return bank;
    return prisma_1.default.bank.create({ data: { userId, balance: 0 } });
}
/** deposit from wallet -> bank (used by !deposit command) */
async function depositToBank(walletId, userId, amount) {
    if (amount <= 0)
        throw new Error("Amount must be greater than 0.");
    const bank = await ensureBankForUser(userId);
    // Ensure wallet has funds
    const wallet = await prisma_1.default.wallet.findUnique({ where: { id: walletId } });
    if (!wallet)
        throw new Error("Wallet not found.");
    if (wallet.balance < amount)
        throw new Error("Insufficient wallet balance.");
    await prisma_1.default.$transaction([
        prisma_1.default.transaction.create({
            data: { walletId, amount: -amount, type: "wallet_to_bank", meta: { toBank: true }, isEarned: false }
        }),
        prisma_1.default.wallet.update({ where: { id: walletId }, data: { balance: { decrement: amount } } }),
        prisma_1.default.bank.update({ where: { id: bank.id }, data: { balance: { increment: amount } } }),
        prisma_1.default.audit.create({ data: { userId: wallet.userId, type: "bank_deposit", meta: { amount } } })
    ]);
    return bank;
}
/** withdraw from bank -> wallet */
async function withdrawFromBank(walletId, userId, amount) {
    if (amount <= 0)
        throw new Error("Amount must be greater than 0.");
    const bank = await ensureBankForUser(userId);
    if (bank.balance < amount)
        throw new Error("Insufficient funds in bank.");
    await prisma_1.default.$transaction([
        prisma_1.default.transaction.create({
            data: { walletId, amount, type: "bank_to_wallet", meta: { fromBank: bank.id }, isEarned: false }
        }),
        prisma_1.default.wallet.update({ where: { id: walletId }, data: { balance: { increment: amount } } }),
        prisma_1.default.bank.update({ where: { id: bank.id }, data: { balance: { decrement: amount } } }),
        prisma_1.default.audit.create({ data: { userId, type: "bank_withdraw", meta: { amount } } })
    ]);
    return bank;
}
async function getBankByUserId(userId) {
    return prisma_1.default.bank.findUnique({ where: { userId } });
}
/** Admin remove from bank */
async function removeMoneyFromBank(userId, amount) {
    const bank = await ensureBankForUser(userId);
    if (bank.balance < amount)
        throw new Error("Insufficient bank funds.");
    // We need walletId for the transaction log relation
    const wallet = await prisma_1.default.wallet.findUnique({ where: { userId } });
    if (!wallet)
        throw new Error("Wallet not found (DB Error).");
    const [updatedBank] = await prisma_1.default.$transaction([
        prisma_1.default.bank.update({ where: { userId }, data: { balance: { decrement: amount } } }),
        prisma_1.default.transaction.create({
            data: {
                walletId: wallet.id,
                amount: -amount,
                type: "admin_remove_bank",
                meta: { by: "admin" },
                isEarned: false
            }
        })
    ]);
    return updatedBank.balance;
}
//# sourceMappingURL=bankService.js.map