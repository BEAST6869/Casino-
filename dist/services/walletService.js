"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureUserAndWallet = ensureUserAndWallet;
exports.getWalletByDiscord = getWalletByDiscord;
exports.getWalletById = getWalletById;
exports.depositToWallet = depositToWallet;
exports.removeMoneyFromWallet = removeMoneyFromWallet;
exports.transferMoney = transferMoney;
const prisma_1 = __importDefault(require("../utils/prisma"));
const guildConfigService_1 = require("./guildConfigService");
// User Cache: Stores which Discord IDs we have already verified exist
const userIdCache = new Map();
/** ensure user exists (by discordId) and wallet exists */
async function ensureUserAndWallet(discordId, username) {
    // 1. FAST: Check cache. If known, fetch full data including profileTheme
    if (userIdCache.has(discordId)) {
        const user = await prisma_1.default.user.findUnique({
            where: { discordId },
            include: { wallet: true }
        });
        // Return immediately if found
        if (user && user.wallet)
            return user;
    }
    // 2. SLOW: If not in cache, check DB or Create
    // We use upsert to guarantee the user exists and has a wallet
    const user = await prisma_1.default.user.upsert({
        where: { discordId },
        update: { username }, // Update username if changed
        create: {
            discordId,
            username,
            profileTheme: "cyberpunk", // Default theme
            wallet: { create: { balance: 1000 } }
        },
        include: { wallet: true }
    });
    // 4. Update Cache
    userIdCache.set(discordId, user.id);
    return user;
}
async function getWalletByDiscord(discordId) {
    const user = await prisma_1.default.user.findUnique({ where: { discordId }, include: { wallet: true } });
    return user?.wallet ?? null;
}
async function getWalletById(walletId) {
    return prisma_1.default.wallet.findUnique({ where: { id: walletId } });
}
/** Admin deposit to wallet */
async function depositToWallet(walletId, amount, meta = {}, earned = false, guildId) {
    if (guildId) {
        const config = await (0, guildConfigService_1.getGuildConfig)(guildId);
        if (config.walletLimit) {
            const wallet = await prisma_1.default.wallet.findUnique({ where: { id: walletId } });
            if (wallet && wallet.balance + amount > config.walletLimit) {
                throw new Error(`Wallet limit of ${config.walletLimit} reached.`);
            }
        }
    }
    await prisma_1.default.$transaction([
        prisma_1.default.transaction.create({ data: { walletId, amount, type: "deposit", meta, isEarned: earned } }),
        prisma_1.default.wallet.update({ where: { id: walletId }, data: { balance: { increment: amount } } })
    ]);
}
/** Admin remove from wallet */
async function removeMoneyFromWallet(walletId, amount) {
    const wallet = await prisma_1.default.wallet.findUnique({ where: { id: walletId } });
    if (!wallet || wallet.balance < amount)
        throw new Error("Insufficient wallet funds.");
    await prisma_1.default.$transaction([
        prisma_1.default.transaction.create({
            data: {
                walletId,
                amount: -amount,
                type: "admin_remove",
                meta: { by: "admin" }
            }
        }),
        prisma_1.default.wallet.update({
            where: { id: walletId },
            data: { balance: { decrement: amount } }
        })
    ]);
    return wallet.balance - amount;
}
/** Transfer money between users (Discord IDs) */
async function transferMoney(fromDiscordId, toDiscordId, amount, guildId) {
    if (amount <= 0)
        throw new Error("Amount must be positive.");
    if (fromDiscordId === toDiscordId)
        throw new Error("Cannot transfer to self.");
    // Ensure wallets
    // Since we don't have usernames here easily, we rely on them existing or passing placeholders if needed. 
    // Ideally ensureUser calls should happen before. 
    // But for robustness:
    const fromUser = await prisma_1.default.user.findUnique({ where: { discordId: fromDiscordId }, include: { wallet: true } });
    if (!fromUser || !fromUser.wallet)
        throw new Error("Sender has no wallet.");
    // Check balance
    if (fromUser.wallet.balance < amount)
        throw new Error("Insufficient funds.");
    const toUser = await ensureUserAndWallet(toDiscordId, "UnknownUser"); // Fallback username
    // CHECK RECEIVER LIMIT
    const config = await (0, guildConfigService_1.getGuildConfig)(guildId);
    if (config.walletLimit) {
        if (toUser.wallet.balance + amount > config.walletLimit) {
            throw new Error(`Recipient's wallet is full (Max: ${config.walletLimit}).`);
        }
    }
    await prisma_1.default.$transaction([
        // Deduct from Sender
        prisma_1.default.wallet.update({
            where: { id: fromUser.wallet.id },
            data: { balance: { decrement: amount } }
        }),
        prisma_1.default.transaction.create({
            data: {
                walletId: fromUser.wallet.id,
                amount: -amount,
                type: "transfer_sent",
                meta: { to: toDiscordId }
            }
        }),
        // Add to Receiver
        prisma_1.default.wallet.update({
            where: { id: toUser.wallet.id },
            data: { balance: { increment: amount } }
        }),
        prisma_1.default.transaction.create({
            data: {
                walletId: toUser.wallet.id,
                amount: amount,
                type: "transfer_recv",
                meta: { from: fromDiscordId }
            }
        })
    ]);
}
//# sourceMappingURL=walletService.js.map