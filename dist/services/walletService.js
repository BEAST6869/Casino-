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
// Key = Discord ID, Value = Database ID
const userIdCache = new Map();
/** ensure user exists (by discordId) and wallet exists */
async function ensureUserAndWallet(discordId, username) {
    // 1. FAST: Check cache. If we know they exist, fetch data directly (Read-Only)
    if (userIdCache.has(discordId)) {
        const user = await prisma_1.default.user.findUnique({
            where: { discordId },
            include: { wallet: true }
        });
        // Return immediately if found
        if (user && user.wallet)
            return user;
    }
    // 2. SLOW: If not in cache, check DB (Read-Only)
    let user = await prisma_1.default.user.findUnique({
        where: { discordId },
        include: { wallet: true }
    });
    // 3. Create only if absolutely necessary (Write)
    if (!user) {
        user = await prisma_1.default.user.create({
            data: {
                discordId,
                username,
                wallet: { create: { balance: 1000 } }
            },
            include: { wallet: true }
        });
    }
    // 4. Update Cache
    userIdCache.set(discordId, user.id);
    // 5. Background Task: Update username if changed (Don't wait for this to finish)
    // This keeps the bot fast because we don't wait for this write operation.
    if (user.username !== username) {
        prisma_1.default.user.update({
            where: { id: user.id },
            data: { username }
        }).catch(() => { }); // Catch errors to prevent crashes on background update
    }
    return user;
}
async function getWalletByDiscord(discordId) {
    const user = await prisma_1.default.user.findUnique({ where: { discordId }, include: { wallet: true } });
    return user?.wallet ?? null;
}
async function getWalletById(walletId) {
    return prisma_1.default.wallet.findUnique({ where: { id: walletId } });
}
/** Admin deposit to wallet (non-earned by default if needed) */
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