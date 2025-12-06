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
const prisma_1 = __importDefault(require("../utils/prisma"));
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
async function depositToWallet(walletId, amount, meta = {}, earned = false) {
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
}
//# sourceMappingURL=walletService.js.map