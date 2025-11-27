// src/services/walletService.ts
import prisma from "../utils/prisma";

/** ensure user exists (by discordId) and wallet exists */
export async function ensureUserAndWallet(discordId: string, username: string) {
  const user = await prisma.user.upsert({
    where: { discordId },
    update: { username },
    create: { discordId, username, wallet: { create: { balance: 1000 } } },
    include: { wallet: true }
  });
  return user;
}

export async function getWalletByDiscord(discordId: string) {
  const user = await prisma.user.findUnique({ where: { discordId }, include: { wallet: true } });
  return user?.wallet ?? null;
}

export async function getWalletById(walletId: string) {
  return prisma.wallet.findUnique({ where: { id: walletId } });
}

/** Admin deposit to wallet (non-earned by default if needed) */
export async function depositToWallet(walletId: string, amount: number, meta: any = {}, earned = false) {
  await prisma.$transaction([
    prisma.transaction.create({ data: { walletId, amount, type: "deposit", meta, isEarned: earned } }),
    prisma.wallet.update({ where: { id: walletId }, data: { balance: { increment: amount } } })
  ]);
}
