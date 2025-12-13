"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleMessage = handleMessage;
const prisma_1 = __importDefault(require("./utils/prisma"));
async function handleMessage(message) {
    const [cmd, ...args] = message.content.slice(1).trim().split(/\s+/);
    const discordId = message.author.id;
    switch (cmd.toLowerCase()) {
        case "balance":
            return cmdBalance(message, discordId);
        case "deposit":
            return cmdDeposit(message, discordId, args);
        case "bet":
            return cmdBet(message, discordId, args);
        default:
            return message.reply("Unknown command. Try `!balance`, `!deposit <amount>`, `!bet <amount> <choice>`");
    }
}
async function ensureUserAndWallet(discordId, guildId, username) {
    const user = await prisma_1.default.user.upsert({
        where: { discordId_guildId: { discordId, guildId } },
        update: { username },
        create: {
            discordId,
            guildId,
            username,
            wallet: { create: { balance: 1000 } }
        },
        include: { wallet: true }
    });
    return user;
}
async function cmdBalance(message, discordId) {
    const user = await ensureUserAndWallet(discordId, message.guildId, message.author.tag);
    const balance = user.wallet?.balance ?? 0;
    await message.reply(`Your balance: ${balance}`);
}
async function cmdDeposit(message, discordId, args) {
    const amount = Math.floor(Number(args[0] || 0));
    if (!amount || amount <= 0) {
        await message.reply("Enter a valid deposit amount.");
        return;
    }
    const user = await ensureUserAndWallet(discordId, message.guildId, message.author.tag);
    const walletId = user.wallet.id;
    await prisma_1.default.$transaction([
        prisma_1.default.transaction.create({ data: { walletId, amount, type: "deposit", meta: { via: "manual" } } }),
        prisma_1.default.wallet.update({ where: { id: walletId }, data: { balance: { increment: amount } } })
    ]);
    const refreshed = await prisma_1.default.wallet.findUnique({ where: { id: walletId } });
    await message.reply(`Deposited ${amount}. New balance: ${refreshed?.balance ?? 0}`);
}
async function cmdBet(message, discordId, args) {
    const amount = Math.floor(Number(args[0] || 0));
    const choice = args[1] ?? "default";
    if (!amount || amount <= 0) {
        await message.reply("Enter a valid bet amount.");
        return;
    }
    const user = await ensureUserAndWallet(discordId, message.guildId, message.author.tag);
    const wallet = user.wallet;
    if (!wallet) {
        await message.reply("Wallet not found. Try again.");
        return;
    }
    if (wallet.balance < amount) {
        await message.reply("Insufficient funds.");
        return;
    }
    const didWin = Math.random() < 0.5;
    const payout = didWin ? amount * 2 : 0;
    const netChange = payout - amount;
    try {
        await betWithTransaction(user.id, wallet.id, amount, choice, didWin, payout, netChange);
    }
    catch (e) {
        console.warn("Transaction bet failed, attempting fallback:", e.message);
        try {
            await betFallbackAtomic(wallet.id, user.id, amount, choice, didWin, payout, netChange);
        }
        catch (err) {
            console.error("Fallback bet failed:", err);
            await message.reply("Bet failed due to internal error.");
            return;
        }
    }
    const newWallet = await prisma_1.default.wallet.findUnique({ where: { id: wallet.id } });
    const newBal = newWallet?.balance ?? 0;
    if (didWin) {
        await message.reply(`You won! Payout ${payout}. New balance: ${newBal}`);
    }
    else {
        await message.reply(`You lost ${amount}. New balance: ${newBal}`);
    }
}
async function betWithTransaction(userId, walletId, amount, choice, didWin, payout, netChange) {
    await prisma_1.default.$transaction(async (tx) => {
        await tx.bet.create({
            data: {
                userId,
                gameId: "roulette_id_placeholder",
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
async function betFallbackAtomic(walletId, userId, amount, choice, didWin, payout, netChange) {
    const res = await prisma_1.default.wallet.updateMany({
        where: { id: walletId, balance: { gte: amount } },
        data: { balance: { decrement: amount } }
    });
    if (res.count === 0) {
        throw new Error("Insufficient funds at update stage");
    }
    await prisma_1.default.bet.create({
        data: {
            userId,
            gameId: "roulette_id_placeholder",
            amount,
            choice,
            result: didWin ? "win" : "lose",
            payout
        }
    });
    await prisma_1.default.transaction.create({
        data: {
            walletId,
            amount: didWin ? (payout) - amount : -amount,
            type: didWin ? "payout" : "bet",
            meta: { choice, payout, didWin }
        }
    });
    if (didWin) {
        await prisma_1.default.wallet.update({ where: { id: walletId }, data: { balance: { increment: payout } } });
    }
}
//# sourceMappingURL=commands.js.map