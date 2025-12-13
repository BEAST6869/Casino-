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
const prisma_1 = __importDefault(require("../utils/prisma"));
async function ensureBankForUser(userIdOrDiscordId, guildId) {
    let userId = userIdOrDiscordId;
    if (!userIdOrDiscordId.match(/^[0-9a-fA-F]{24}$/)) {
        if (!guildId)
            throw new Error("Guild ID required for bank creation by Discord ID.");
        const user = await prisma_1.default.user.findUnique({
            where: { discordId_guildId: { discordId: userIdOrDiscordId, guildId } }
        });
        if (!user)
            throw new Error("User not found for bank creation.");
        userId = user.id;
    }
    const bank = await prisma_1.default.bank.findUnique({ where: { userId } });
    if (bank)
        return bank;
    return prisma_1.default.bank.create({ data: { userId, balance: 0 } });
}
const guildConfigService_1 = require("./guildConfigService");
async function depositToBank(walletId, userId, amount, guildId) {
    if (amount <= 0)
        throw new Error("Amount must be greater than 0.");
    const bank = await ensureBankForUser(userId);
    const config = await (0, guildConfigService_1.getGuildConfig)(guildId);
    let depositAmount = amount;
    if (config.bankLimit) {
        const space = config.bankLimit - bank.balance;
        if (space <= 0) {
            throw new Error(`Bank limit of ${config.bankLimit} reached.`);
        }
        if (depositAmount > space) {
            depositAmount = space;
        }
    }
    const wallet = await prisma_1.default.wallet.findUnique({ where: { id: walletId } });
    if (!wallet)
        throw new Error("Wallet not found.");
    if (wallet.balance < depositAmount)
        throw new Error("Insufficient wallet balance.");
    await prisma_1.default.$transaction([
        prisma_1.default.transaction.create({
            data: { walletId, amount: -depositAmount, type: "wallet_to_bank", meta: { toBank: true }, isEarned: false }
        }),
        prisma_1.default.wallet.update({ where: { id: walletId }, data: { balance: { decrement: depositAmount } } }),
        prisma_1.default.bank.update({ where: { id: bank.id }, data: { balance: { increment: depositAmount } } }),
        prisma_1.default.audit.create({ data: { userId: wallet.userId, type: "bank_deposit", meta: { amount: depositAmount } } })
    ]);
    return { bank, actualAmount: depositAmount };
}
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
async function removeMoneyFromBank(userId, amount) {
    const bank = await ensureBankForUser(userId);
    if (bank.balance < amount)
        throw new Error("Insufficient bank funds.");
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