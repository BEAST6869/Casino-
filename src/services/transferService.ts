// src/services/transferService.ts
import prisma from "../utils/prisma";

/**
 * Transfer from one user's wallet to another user's wallet.
 * Gifting relaxed: allows transfer as long as sender wallet.balance >= amount.
 */
export async function transferAnyFunds(fromWalletId: string, toDiscordId: string, amount: number, fromDiscordId: string, guildId?: string) {
  if (amount <= 0) throw new Error("Invalid amount.");
  // fetch sender wallet & check balance
  const fromWallet = await prisma.wallet.findUnique({ where: { id: fromWalletId } });
  if (!fromWallet) throw new Error("Sender wallet not found.");
  if (fromWallet.balance < amount) throw new Error("Insufficient funds.");

  // ensure recipient user & wallet
  const recipient = await prisma.user.upsert({
    where: { discordId: toDiscordId },
    update: {},
    create: { discordId: toDiscordId, username: "Unknown", wallet: { create: { balance: 0 } } },
    include: { wallet: true }
  });
  const toWalletId = recipient.wallet!.id;

  await prisma.$transaction([
    prisma.transaction.create({ data: { walletId: fromWalletId, amount: -amount, type: "transfer_sent", meta: { to: toDiscordId }, isEarned: false } }),
    prisma.wallet.update({ where: { id: fromWalletId }, data: { balance: { decrement: amount } } }),
    prisma.transaction.create({ data: { walletId: toWalletId, amount, type: "transfer_recv", meta: { from: fromDiscordId }, isEarned: false } }),
    prisma.wallet.update({ where: { id: toWalletId }, data: { balance: { increment: amount } } }),
    prisma.audit.create({ data: { guildId: guildId ?? undefined, userId: fromDiscordId, type: "transfer", meta: { to: toDiscordId, amount } } })
  ]);

  return true;
}
